'use server';

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

// ============================================================================
// Zod Schemas
// ============================================================================

const ImageLibraryDataSchema = z.object({
    url: z.string().url('Ungültige URL.'),
    product_name: z.string().min(1, 'Produktname ist erforderlich.').max(255, 'Produktname ist zu lang.'),
});

type ImageLibraryData = z.infer<typeof ImageLibraryDataSchema>;

// ============================================================================
// Result types
// ============================================================================

interface ActionResult {
    success: boolean;
    error?: string;
    imageId?: string;
    imageData?: {
        id: string;
        url: string;
        product_name: string;
    };
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
        return { error: 'Keine Berechtigung. Nur Admins können die Bildbibliothek verwalten.' };
    }

    return { userId: user.id };
}

// ============================================================================
// Helper: Sanitize product name
// ============================================================================

function sanitizeProductName(name: string): string {
    // Remove any HTML tags
    let sanitized = name.replace(/<[^>]*>/g, '');

    // Remove any script tags or javascript
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length
    if (sanitized.length > 255) {
        sanitized = sanitized.substring(0, 255);
    }

    return sanitized;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Adds an image to the library.
 *
 * Security: session → is_admin() → Zod validation → URL validation → sanitization → service_role insert
 */
export async function addToImageLibrary(url: string, productName: string): Promise<ActionResult> {
    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    // Validate inputs
    const parsed = ImageLibraryDataSchema.safeParse({ url, product_name: productName });
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: `Validierungsfehler: ${firstError.path.join('.')} – ${firstError.message}` };
    }

    // Additional URL validation - ensure it's from our storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
        return { success: false, error: 'Supabase URL nicht konfiguriert.' };
    }

    // Check if URL is from our Supabase storage
    if (!url.startsWith(supabaseUrl)) {
        return { success: false, error: 'Nur Bilder aus dem eigenen Storage sind erlaubt.' };
    }

    // Sanitize product name to prevent XSS
    const sanitizedProductName = sanitizeProductName(parsed.data.product_name);

    if (!sanitizedProductName) {
        return { success: false, error: 'Produktname ist nach der Bereinigung leer.' };
    }

    const serviceClient = createServiceClient();

    // Insert into image_library
    const { data: newImage, error: insertError } = await serviceClient
        .from('image_library')
        .insert({
            url: parsed.data.url,
            product_name: sanitizedProductName,
        })
        .select('id, url, product_name')
        .single();

    if (insertError) {
        console.error('[library/addToImageLibrary] Insert failed:', insertError);
        return { success: false, error: 'Datenbankfehler beim Hinzufügen des Bildes.' };
    }

    return {
        success: true,
        imageId: newImage.id,
        imageData: newImage
    };
}

/**
 * Deletes an image from the library.
 *
 * Security: session → is_admin() → image exists → service_role delete
 */
export async function deleteFromLibrary(imageId: string): Promise<ActionResult> {
    if (!imageId || typeof imageId !== 'string') {
        return { success: false, error: 'Ungültige Bild-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    // Verify image exists
    const { data: existing, error: fetchError } = await serviceClient
        .from('image_library')
        .select('id')
        .eq('id', imageId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Bild nicht gefunden.' };
    }

    // Check if image is being used by any offers
    const { data: offersUsingImage, error: checkError } = await serviceClient
        .from('offers')
        .select('id')
        .eq('image_id', imageId)
        .limit(1);

    if (checkError) {
        console.error('[library/deleteFromLibrary] Check failed:', checkError);
        return { success: false, error: 'Fehler beim Überprüfen der Bildverwendung.' };
    }

    if (offersUsingImage && offersUsingImage.length > 0) {
        return { success: false, error: 'Bild wird noch von Angeboten verwendet und kann nicht gelöscht werden.' };
    }

    // Delete the image
    const { error: deleteError } = await serviceClient
        .from('image_library')
        .delete()
        .eq('id', imageId);

    if (deleteError) {
        console.error('[library/deleteFromLibrary] Delete failed:', deleteError);
        return { success: false, error: 'Datenbankfehler beim Löschen des Bildes.' };
    }

    return { success: true };
}

/**
 * Lists all images in the library.
 *
 * Security: session → is_admin() → service_role select
 */
export async function listLibraryImages(): Promise<ActionResult & { images?: Array<{ id: string; url: string; product_name: string }> }> {
    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    const { data: images, error: fetchError } = await serviceClient
        .from('image_library')
        .select('id, url, product_name')
        .order('created_at', { ascending: false });

    if (fetchError) {
        console.error('[library/listLibraryImages] Fetch failed:', fetchError);
        return { success: false, error: 'Datenbankfehler beim Laden der Bilder.' };
    }

    return {
        success: true,
        images: images || []
    };
}

/**
 * Updates the product name of an image in the library.
 *
 * Security: session → is_admin() → validation → sanitization → service_role update
 */
export async function updateImageProductName(imageId: string, productName: string): Promise<ActionResult> {
    if (!imageId || typeof imageId !== 'string') {
        return { success: false, error: 'Ungültige Bild-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    // Validate product name
    const parsed = z.string().min(1, 'Produktname ist erforderlich.').max(255, 'Produktname ist zu lang.').safeParse(productName);
    if (!parsed.success) {
        return { success: false, error: `Validierungsfehler: ${parsed.error.issues[0].message}` };
    }

    // Sanitize product name
    const sanitizedProductName = sanitizeProductName(parsed.data);

    if (!sanitizedProductName) {
        return { success: false, error: 'Produktname ist nach der Bereinigung leer.' };
    }

    const serviceClient = createServiceClient();

    // Verify image exists
    const { data: existing, error: fetchError } = await serviceClient
        .from('image_library')
        .select('id')
        .eq('id', imageId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Bild nicht gefunden.' };
    }

    // Update the product name
    const { error: updateError } = await serviceClient
        .from('image_library')
        .update({ product_name: sanitizedProductName })
        .eq('id', imageId);

    if (updateError) {
        console.error('[library/updateImageProductName] Update failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Aktualisieren des Produktnamens.' };
    }

    return { success: true };
}
