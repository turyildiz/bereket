'use server';

import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
import { randomUUID } from 'crypto';

interface SignedUploadUrlResult {
    success: boolean;
    error?: string;
    signedUrl?: string;
    publicUrl?: string;
    path?: string;
}

// Allowed buckets — prevents access to internal/private buckets
const ALLOWED_BUCKETS = ['market-assets', 'offer-images'];

// Allowed MIME types for image uploads
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
];

// Max file extension length to prevent abuse
const MAX_EXTENSION_LENGTH = 5;

/**
 * Generates a signed upload URL for secure file uploads to Supabase Storage.
 *
 * Security:
 * - Verifies the requester is an Admin using is_admin() helper.
 * - Validates bucket against allowlist.
 * - Validates file content-type against allowed MIME types.
 * - Uses service_role client to generate signed upload URL.
 * - Enforces UUID filename rule to prevent path traversal and ensure uniqueness.
 */
export async function getSignedUploadUrl(
    fileName: string,
    fileType: string,
    bucket: string
): Promise<SignedUploadUrlResult> {
    // 1. Validate inputs
    if (!fileName || typeof fileName !== 'string') {
        return { success: false, error: 'Ungültiger Dateiname.' };
    }
    if (!bucket || typeof bucket !== 'string') {
        return { success: false, error: 'Ungültiger Bucket-Name.' };
    }

    // 2. Validate bucket against allowlist
    if (!ALLOWED_BUCKETS.includes(bucket)) {
        return { success: false, error: 'Ungültiger Bucket. Erlaubt: ' + ALLOWED_BUCKETS.join(', ') };
    }

    // 3. Validate content type
    if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType)) {
        return { success: false, error: 'Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF, AVIF.' };
    }

    // 4. Verify admin permissions
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Nicht authentifiziert. Bitte erneut anmelden.' };
    }

    const { data: isAdmin, error: rpcError } = await authClient.rpc('is_admin');
    if (rpcError || !isAdmin) {
        return { success: false, error: 'Keine Berechtigung. Nur Admins können Dateien hochladen.' };
    }

    // 5. Generate secure path with validated extension
    const fileExtMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = fileExtMatch ? fileExtMatch[1].toLowerCase() : 'bin';

    if (fileExt.length > MAX_EXTENSION_LENGTH || fileExt === 'bin') {
        return { success: false, error: 'Ungültige Dateiendung.' };
    }

    const uuidFileName = `${randomUUID()}.${fileExt}`;

    // 6. Generate Signed URL using service_role
    const serviceClient = createServiceClient();

    try {
        const { data, error } = await serviceClient.storage
            .from(bucket)
            .createSignedUploadUrl(uuidFileName);

        if (error) {
            console.error('[storage/getSignedUploadUrl] Failed to create signed URL:', error);
            return {
                success: false,
                error: 'Fehler beim Erstellen der Upload-URL: ' + error.message
            };
        }

        if (!data?.signedUrl || !data?.path) {
            return { success: false, error: 'Keine Upload-URL erhalten.' };
        }

        // 7. Get Public URL
        const { data: publicUrlData } = serviceClient.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return {
            success: true,
            signedUrl: data.signedUrl,
            path: data.path,
            publicUrl: publicUrlData.publicUrl
        };

    } catch (err) {
        console.error('[storage/getSignedUploadUrl] Unexpected error:', err);
        return {
            success: false,
            error: 'Unerwarteter Fehler beim Erstellen der Upload-URL.'
        };
    }
}
