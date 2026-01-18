import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Use regular client to check authorization
        const supabase = await createClient();

        // Check if the requesting user is a superadmin
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check user's role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'superadmin') {
            return NextResponse.json(
                { error: 'Only superadmins can create users' },
                { status: 403 }
            );
        }

        // Create admin client with service role key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            console.error('[Create User API] Service role key not found');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Create the user using Supabase Admin API
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm the email
        });

        if (createError) {
            console.error('[Create User API] Error creating user:', createError);
            return NextResponse.json(
                { error: createError.message },
                { status: 400 }
            );
        }

        // The profile entry should be created automatically by a database trigger
        // Wait a moment and fetch the profile to confirm
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newUser.user.id)
            .single();

        return NextResponse.json({
            success: true,
            user: newProfile || { id: newUser.user.id, email: newUser.user.email, role: 'user', created_at: new Date().toISOString() }
        });

    } catch (error) {
        console.error('[Create User API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
