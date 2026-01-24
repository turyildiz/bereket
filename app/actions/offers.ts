'use server';

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

// ============================================================================
// Zod Schemas
// ============================================================================

const OfferDataSchema = z.object({
    market_id: z.string().uuid('Ungültige Markt-ID.'),
    product_name: z.string().min(1, 'Produktname ist erforderlich.'),
    price: z.string().min(1, 'Preis ist erforderlich.'),
    description: z.string().nullable().optional(),
    image_id: z.string().uuid().nullable().optional(),
    expires_at: z.string().refine((date) => {
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    }, 'Ungültiges Ablaufdatum.'),
    status: z.enum(['draft', 'live', 'expired']).optional().default('draft'),
    unit: z.string().nullable().optional(),
    ai_category: z.string().nullable().optional(),
});

type OfferData = z.infer<typeof OfferDataSchema>;

// Schema for bulk operations — validates each ID is a UUID and caps array size
const BulkIdsSchema = z.array(z.string().uuid('Ungültige Angebots-ID.'))
    .min(1, 'Keine Angebote angegeben.')
    .max(100, 'Maximal 100 Angebote pro Bulk-Aktion.');

// ============================================================================
// Result types
// ============================================================================

interface ActionResult {
    success: boolean;
    error?: string;
    offerId?: string;
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
        return { error: 'Keine Berechtigung. Nur Admins können Angebote verwalten.' };
    }

    return { userId: user.id };
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Creates a new offer.
 *
 * Security: session → is_admin() → Zod validation → market exists check → service_role insert
 */
export async function createOffer(rawData: unknown): Promise<ActionResult> {
    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const parsed = OfferDataSchema.safeParse(rawData);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: `Validierungsfehler: ${firstError.path.join('.')} – ${firstError.message}` };
    }

    const serviceClient = createServiceClient();

    // IMPORTANT SECURITY CHECK: Verify market_id exists
    const { data: marketExists, error: marketCheckError } = await serviceClient
        .from('markets')
        .select('id')
        .eq('id', parsed.data.market_id)
        .single();

    if (marketCheckError || !marketExists) {
        return { success: false, error: 'Der angegebene Markt existiert nicht.' };
    }

    // Insert the offer
    const { data: insertedOffer, error: insertError } = await serviceClient
        .from('offers')
        .insert({
            market_id: parsed.data.market_id,
            product_name: parsed.data.product_name,
            price: parsed.data.price,
            description: parsed.data.description || null,
            image_id: parsed.data.image_id || null,
            expires_at: parsed.data.expires_at,
            status: parsed.data.status || 'draft',
            unit: parsed.data.unit || 'Stück',
            ai_category: parsed.data.ai_category || null,
        })
        .select('id')
        .single();

    if (insertError) {
        console.error('[offers/createOffer] Insert failed:', insertError);
        return { success: false, error: 'Datenbankfehler beim Erstellen des Angebots.' };
    }

    return { success: true, offerId: insertedOffer.id };
}

/**
 * Updates an existing offer.
 *
 * Security: session → is_admin() → Zod validation → offer exists → service_role update
 */
export async function updateOffer(offerId: string, rawData: unknown): Promise<ActionResult> {
    if (!offerId || typeof offerId !== 'string') {
        return { success: false, error: 'Ungültige Angebots-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const parsed = OfferDataSchema.partial().safeParse(rawData);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: `Validierungsfehler: ${firstError.path.join('.')} – ${firstError.message}` };
    }

    // Reject empty updates
    if (Object.keys(parsed.data).length === 0) {
        return { success: false, error: 'Keine Änderungen angegeben.' };
    }

    const serviceClient = createServiceClient();

    // Verify offer exists
    const { data: existing, error: fetchError } = await serviceClient
        .from('offers')
        .select('id')
        .eq('id', offerId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Angebot nicht gefunden.' };
    }

    // If market_id is being updated, verify it exists
    if (parsed.data.market_id) {
        const { data: marketExists, error: marketCheckError } = await serviceClient
            .from('markets')
            .select('id')
            .eq('id', parsed.data.market_id)
            .single();

        if (marketCheckError || !marketExists) {
            return { success: false, error: 'Der angegebene Markt existiert nicht.' };
        }
    }

    // Update the offer
    const { error: updateError } = await serviceClient
        .from('offers')
        .update(parsed.data)
        .eq('id', offerId);

    if (updateError) {
        console.error('[offers/updateOffer] Update failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Aktualisieren des Angebots.' };
    }

    return { success: true, offerId };
}

/**
 * Deletes an offer permanently.
 *
 * Security: session → is_admin() → offer exists → service_role delete
 */
export async function deleteOffer(offerId: string): Promise<ActionResult> {
    if (!offerId || typeof offerId !== 'string') {
        return { success: false, error: 'Ungültige Angebots-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    // Verify offer exists
    const { data: existing, error: fetchError } = await serviceClient
        .from('offers')
        .select('id')
        .eq('id', offerId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Angebot nicht gefunden.' };
    }

    // Delete the offer
    const { error: deleteError } = await serviceClient
        .from('offers')
        .delete()
        .eq('id', offerId);

    if (deleteError) {
        console.error('[offers/deleteOffer] Delete failed:', deleteError);
        return { success: false, error: 'Datenbankfehler beim Löschen des Angebots.' };
    }

    return { success: true };
}

/**
 * Publishes an offer by setting its status to 'live'.
 *
 * Security: session → is_admin() → offer exists → service_role update
 */
export async function publishOffer(offerId: string): Promise<ActionResult> {
    if (!offerId || typeof offerId !== 'string') {
        return { success: false, error: 'Ungültige Angebots-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    // Verify offer exists
    const { data: existing, error: fetchError } = await serviceClient
        .from('offers')
        .select('id, status')
        .eq('id', offerId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Angebot nicht gefunden.' };
    }

    // Guard: reject if already live
    if (existing.status === 'live') {
        return { success: false, error: 'Angebot ist bereits veröffentlicht.' };
    }

    // Update status to 'live'
    const { error: updateError } = await serviceClient
        .from('offers')
        .update({ status: 'live' })
        .eq('id', offerId);

    if (updateError) {
        console.error('[offers/publishOffer] Publish failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Veröffentlichen des Angebots.' };
    }

    return { success: true, offerId };
}

/**
 * Sets an offer status to 'draft'.
 *
 * Security: session → is_admin() → offer exists → service_role update
 */
export async function unpublishOffer(offerId: string): Promise<ActionResult> {
    if (!offerId || typeof offerId !== 'string') {
        return { success: false, error: 'Ungültige Angebots-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    // Verify offer exists
    const { data: existing, error: fetchError } = await serviceClient
        .from('offers')
        .select('id, status')
        .eq('id', offerId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Angebot nicht gefunden.' };
    }

    // Update status to 'draft'
    const { error: updateError } = await serviceClient
        .from('offers')
        .update({ status: 'draft' })
        .eq('id', offerId);

    if (updateError) {
        console.error('[offers/unpublishOffer] Unpublish failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Zurückziehen des Angebots.' };
    }

    return { success: true, offerId };
}

/**
 * Bulk deletes multiple offers.
 *
 * Security: session → is_admin() → service_role delete
 */
export async function bulkDeleteOffers(offerIds: unknown): Promise<ActionResult> {
    const parsed = BulkIdsSchema.safeParse(offerIds);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: firstError.message };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    // Delete all offers in the array
    const { error: deleteError } = await serviceClient
        .from('offers')
        .delete()
        .in('id', parsed.data);

    if (deleteError) {
        console.error('[offers/bulkDeleteOffers] Bulk delete failed:', deleteError);
        return { success: false, error: 'Datenbankfehler beim Löschen der Angebote.' };
    }

    return { success: true };
}

/**
 * Bulk publishes multiple offers.
 *
 * Security: session → is_admin() → service_role update
 */
export async function bulkPublishOffers(offerIds: unknown): Promise<ActionResult> {
    const parsed = BulkIdsSchema.safeParse(offerIds);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: firstError.message };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    // Update all offers to 'live' status
    const { error: updateError } = await serviceClient
        .from('offers')
        .update({ status: 'live' })
        .in('id', parsed.data);

    if (updateError) {
        console.error('[offers/bulkPublishOffers] Bulk publish failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Veröffentlichen der Angebote.' };
    }

    return { success: true };
}
