import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';
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

        // Check if the requesting user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check user is a superadmin using the is_superadmin() RPC for consistency
        const { data: isSuperadmin, error: rpcError } = await supabase.rpc('is_superadmin');

        if (rpcError || !isSuperadmin) {
            return NextResponse.json(
                { error: 'Only superadmins can create users' },
                { status: 403 }
            );
        }

        // Use standardized service client
        const adminClient = createServiceClient();

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

        // The profile entry should be created automatically by a database trigger.
        // Wait briefly, then verify the profile exists.
        await new Promise(resolve => setTimeout(resolve, 500));

        let { data: newProfile } = await adminClient
            .from('profiles')
            .select('*')
            .eq('id', newUser.user.id)
            .single();

        // If the trigger didn't create the profile, insert it manually
        if (!newProfile) {
            const { data: manualProfile, error: profileError } = await adminClient
                .from('profiles')
                .insert({
                    id: newUser.user.id,
                    email: newUser.user.email,
                    role: 'user',
                })
                .select()
                .single();

            if (profileError || !manualProfile) {
                // Rollback: delete the Auth user to prevent a ghost account
                console.error('[Create User API] Profile creation failed, rolling back Auth user:', profileError);
                await adminClient.auth.admin.deleteUser(newUser.user.id);

                return NextResponse.json(
                    { error: 'Profil konnte nicht erstellt werden. Auth-Konto wurde zurückgesetzt.' },
                    { status: 500 }
                );
            }

            newProfile = manualProfile;
        }

        return NextResponse.json({
            success: true,
            user: newProfile,
        });

    } catch (error) {
        console.error('[Create User API] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
