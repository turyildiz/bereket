import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

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

    // Verify user is admin from profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.is_admin) {
        // Not an admin, sign out and redirect
        await supabase.auth.signOut();
        redirect('/admin/login');
    }

    // Fetch all markets from the 'markets' table
    const { data: markets, error } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching markets:', error);
    }

    return <DashboardClient initialMarkets={markets || []} userEmail={user.email || ''} />;
}
