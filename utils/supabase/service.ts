import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with the SERVICE_ROLE_KEY.
 * This client bypasses RLS entirely — use ONLY in Server Actions
 * and API routes, NEVER in client components.
 *
 * Always verify the user's session and permissions BEFORE
 * using this client to perform mutations.
 */
export function createServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable'
        );
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
