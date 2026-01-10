import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

// Role type definition
export type UserRole = 'superadmin' | 'admin' | 'user';

interface PageProps {
    params: Promise<Record<string, string>>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminDashboardPage({ params, searchParams }: PageProps) {
    // Await params for Next.js 15 compatibility
    await params;
    await searchParams;

    const supabase = await createClient();

    // Check for authenticated user - protected route
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/admin/login');
    }

    // Verify user is admin from profiles table and fetch their role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.is_admin) {
        // Not an admin, sign out and redirect
        await supabase.auth.signOut();
        redirect('/admin/login');
    }

    // Determine user role - default to 'admin' if role is not set but is_admin is true
    const userRole: UserRole = (profile.role as UserRole) || 'admin';

    // Fetch initial page of markets (15 items) with premium priority
    const { data: markets, error, count } = await supabase
        .from('markets')
        .select('*', { count: 'exact' })
        .order('is_premium', { ascending: false })
        .order('created_at', { ascending: false })
        .range(0, 14); // First 15 items (0-14)

    if (error) {
        console.error('Error fetching markets:', error);
    }

    // Fetch team members (admins and superadmins) only if user is superadmin
    let teamMembers: Array<{ id: string; email: string; role: UserRole; created_at: string }> = [];
    if (userRole === 'superadmin') {
        const { data: team } = await supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .eq('is_admin', true)
            .order('role', { ascending: false })
            .order('created_at', { ascending: false });

        teamMembers = (team || []) as Array<{ id: string; email: string; role: UserRole; created_at: string }>;
    }

    return (
        <DashboardClient
            initialMarkets={markets || []}
            userEmail={user.email || ''}
            initialTotalCount={count || 0}
            userRole={userRole}
            userId={user.id}
            initialTeamMembers={teamMembers}
        />
    );
}
