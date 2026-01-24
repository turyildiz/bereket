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

/**
 * Generates a signed upload URL for secure file uploads to Supabase Storage.
 *
 * Security:
 * - Verifies the requester is an Admin using is_admin() helper.
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

    // 2. Verify admin permissions
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Nicht authentifiziert. Bitte erneut anmelden.' };
    }

    const { data: isAdmin, error: rpcError } = await authClient.rpc('is_admin');
    if (rpcError || !isAdmin) {
        return { success: false, error: 'Keine Berechtigung. Nur Admins können Dateien hochladen.' };
    }

    // 3. Generate secure path
    // Extract file extension or default to bin if not found
    const fileExtMatch = fileName.match(/\.([^.]+)$/);
    const fileExt = fileExtMatch ? fileExtMatch[1] : 'bin';
    const uuidFileName = `${randomUUID()}.${fileExt}`;

    // 4. Generate Signed URL using service_role
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

        // 5. Get Public URL
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
