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

    // Verify user role from profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        // Profile not found, sign out and redirect
        await supabase.auth.signOut();
        redirect('/admin/login');
    }

    // Check if user has admin or superadmin role
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
        // Not an admin, sign out and redirect
        await supabase.auth.signOut();
        redirect('/admin/login');
    }

    // Set user role
    const userRole: UserRole = profile.role as UserRole;

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
    let regularUsers: Array<{ id: string; email: string; role: UserRole; created_at: string }> = [];
    
    if (userRole === 'superadmin') {
        const { data: team } = await supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .in('role', ['admin', 'superadmin'])
            .order('role', { ascending: false })
            .order('created_at', { ascending: false });

        teamMembers = (team || []) as Array<{ id: string; email: string; role: UserRole; created_at: string }>;
        
        // Fetch initial page of regular users
        const { data: users } = await supabase
            .from('profiles')
            .select('id, email, role, created_at')
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .range(0, 19); // First 20 users
            
        regularUsers = (users || []) as Array<{ id: string; email: string; role: UserRole; created_at: string }>;
    }

    return (
        <DashboardClient
            initialMarkets={markets || []}
            userEmail={user.email || ''}
            initialTotalCount={count || 0}
            userRole={userRole}
            userId={user.id}
            initialTeamMembers={teamMembers}
            initialUsers={regularUsers}
        />
    );
}
