'use server';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { randomUUID } from 'crypto';

// ============================================================================
// Result types
// ============================================================================

interface UploadUrlResult {
    success: boolean;
    error?: string;
    signedUrl?: string;
    path?: string;
}

// ============================================================================
// Helper: Verify admin session
// ============================================================================

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
        return { error: 'Nicht authentifiziert. Bitte erneut anmelden.' };
    }

    const { data: isAdmin, error: rpcError } = await authClient.rpc('is_admin');

    if (rpcError || !isAdmin) {
        return { error: 'Keine Berechtigung. Nur Admins können Dateien hochladen.' };
    }

    return { userId: user.id };
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Generates a signed upload URL for secure file uploads to Supabase Storage.
 * 
 * Security:
 * - Verifies the requester is an Admin using is_admin() helper
 * - Uses service_role client to generate signed upload URL
 * - Enforces UUID filename rule to prevent path traversal and ensure uniqueness
 * 
 * @param fileName - Original filename (used to extract extension)
 * @param bucket - Storage bucket name (e.g., 'market-assets')
 * @returns Signed upload URL and final path, or error message
 */
export async function getUploadUrl(
    fileName: string,
    bucket: string
): Promise<UploadUrlResult> {
    // Validate inputs
    if (!fileName || typeof fileName !== 'string') {
        return { success: false, error: 'Ungültiger Dateiname.' };
    }

    if (!bucket || typeof bucket !== 'string') {
        return { success: false, error: 'Ungültiger Bucket-Name.' };
    }

    // Verify admin permissions
    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    // Extract file extension
    const fileExtMatch = fileName.match(/\.([^.]+)$/);
    const fileExt = fileExtMatch ? fileExtMatch[1] : 'jpg';

    // Generate UUID filename to prevent path traversal and ensure uniqueness
    const uuidFileName = `${randomUUID()}.${fileExt}`;

    // Use service_role client to generate signed upload URL
    const serviceClient = createServiceClient();

    try {
        const { data, error } = await serviceClient.storage
            .from(bucket)
            .createSignedUploadUrl(uuidFileName);

        if (error) {
            console.error('[storage/getUploadUrl] Failed to create signed URL:', error);
            return {
                success: false,
                error: 'Fehler beim Erstellen der Upload-URL: ' + error.message
            };
        }

        if (!data?.signedUrl || !data?.path) {
            return {
                success: false,
                error: 'Keine Upload-URL erhalten.'
            };
        }

        return {
            success: true,
            signedUrl: data.signedUrl,
            path: data.path
        };
    } catch (err) {
        console.error('[storage/getUploadUrl] Unexpected error:', err);
        return {
            success: false,
            error: 'Unerwarteter Fehler beim Erstellen der Upload-URL.'
        };
    }
}
