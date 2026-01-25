'use server';

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

// ============================================================================
// Zod Schemas
// ============================================================================

const UserIdSchema = z.string().uuid('Ungültige Benutzer-ID (kein gültiges UUID-Format).');

// ============================================================================
// Result types
// ============================================================================

interface ActionResult {
    success: boolean;
    error?: string;
    data?: { id: string; email: string; role: string; created_at: string };
}

/**
 * Promotes a user to the 'admin' role.
 *
 * Security chain:
 *   1. Verify the requester has a valid session (cookie-based auth)
 *   2. Call the SECURITY DEFINER function is_admin() to confirm requester is admin
 *   3. Prevent self-promotion (no-op if target === requester)
 *   4. Only then perform the privileged update via service_role client
 */
export async function promoteToAdmin(targetUserId: string): Promise<ActionResult> {
    // --- Input validation with Zod ---
    const parsed = UserIdSchema.safeParse(targetUserId);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message };
    }

    // --- Step 1: Verify the requester's session ---
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Nicht authentifiziert. Bitte erneut anmelden.' };
    }

    // --- Step 2: Verify requester is an admin via is_admin() ---
    const { data: isAdmin, error: rpcError } = await authClient.rpc('is_admin');
    console.log('[teams/promoteToAdmin] is_admin() result:', { isAdmin, rpcError, userId: user.id });

    if (rpcError || !isAdmin) {
        return { success: false, error: 'Keine Berechtigung. Nur Admins können Benutzer hochstufen.' };
    }

    // --- Step 3: Prevent self-promotion ---
    if (user.id === targetUserId) {
        return { success: false, error: 'Sie können sich nicht selbst hochstufen.' };
    }

    // --- Step 4: Perform the privileged update ---
    const serviceClient = createServiceClient();

    const { data, error: updateError } = await serviceClient
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', targetUserId)
        .select('id, email, role, created_at')
        .single();

    if (updateError) {
        console.error('[teams/promoteToAdmin] Update failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Hochstufen.' };
    }

    return { success: true, data };
}

/**
 * Demotes an admin back to the 'user' role.
 *
 * Security chain:
 *   1. Verify the requester has a valid session
 *   2. Call is_admin() to confirm requester is admin
 *   3. Prevent self-demotion
 *   4. Prevent demoting superadmins
 *   5. Perform the privileged update via service_role client
 */
export async function demoteAdmin(targetUserId: string): Promise<ActionResult> {
    // --- Input validation with Zod ---
    const parsed = UserIdSchema.safeParse(targetUserId);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message };
    }

    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Nicht authentifiziert. Bitte erneut anmelden.' };
    }

    const { data: isAdmin, error: rpcError } = await authClient.rpc('is_admin');
    console.log('[teams/demoteAdmin] is_admin() result:', { isAdmin, rpcError, userId: user.id });

    if (rpcError || !isAdmin) {
        return { success: false, error: 'Keine Berechtigung. Nur Admins können Rollen ändern.' };
    }

    if (user.id === targetUserId) {
        return { success: false, error: 'Sie können sich nicht selbst herabstufen.' };
    }

    // Check target's current role to prevent demoting superadmins
    const serviceClient = createServiceClient();

    const { data: targetProfile, error: fetchError } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', targetUserId)
        .single();

    if (fetchError || !targetProfile) {
        return { success: false, error: 'Benutzer nicht gefunden.' };
    }

    if (targetProfile.role === 'superadmin') {
        return { success: false, error: 'Superadmins können nicht herabgestuft werden.' };
    }

    const { data, error: updateError } = await serviceClient
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', targetUserId)
        .select('id, email, role, created_at')
        .single();

    if (updateError) {
        console.error('[teams/demoteAdmin] Update failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Herabstufen.' };
    }

    return { success: true, data };
}

/**
 * Permanently deletes a user profile.
 *
 * Security chain:
 *   1. Verify the requester has a valid session
 *   2. Call is_admin() to confirm requester is admin
 *   3. Prevent self-deletion
 *   4. Prevent deleting superadmins
 *   5. Perform the privileged delete via service_role client
 */
export async function deleteUser(targetUserId: string): Promise<ActionResult> {
    // --- Input validation with Zod ---
    const parsed = UserIdSchema.safeParse(targetUserId);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0].message };
    }

    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Nicht authentifiziert. Bitte erneut anmelden.' };
    }

    const { data: isAdmin, error: rpcError } = await authClient.rpc('is_admin');
    console.log('[teams/deleteUser] is_admin() result:', { isAdmin, rpcError, userId: user.id });

    if (rpcError || !isAdmin) {
        return { success: false, error: 'Keine Berechtigung. Nur Admins können Benutzer löschen.' };
    }

    if (user.id === targetUserId) {
        return { success: false, error: 'Sie können sich nicht selbst löschen.' };
    }

    // Prevent deleting superadmins
    const serviceClient = createServiceClient();

    const { data: targetProfile, error: fetchError } = await serviceClient
        .from('profiles')
        .select('role')
        .eq('id', targetUserId)
        .single();

    if (fetchError || !targetProfile) {
        return { success: false, error: 'Benutzer nicht gefunden.' };
    }

    if (targetProfile.role === 'superadmin') {
        return { success: false, error: 'Superadmins können nicht gelöscht werden.' };
    }

    const { error: deleteError } = await serviceClient
        .from('profiles')
        .delete()
        .eq('id', targetUserId);

    if (deleteError) {
        console.error('[teams/deleteUser] Profile delete failed:', deleteError);
        return { success: false, error: 'Datenbankfehler beim Löschen.' };
    }

    // Remove the Auth account to prevent ghost users
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(targetUserId);

    if (authDeleteError) {
        console.error('[teams/deleteUser] Auth delete failed (ghost user remains):', authDeleteError);
        return { success: false, error: 'Profil gelöscht, aber Auth-Konto konnte nicht entfernt werden.' };
    }

    return { success: true };
}
