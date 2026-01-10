'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Step 1: Sign in with email/password
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // Step 2: Check if user has admin role in profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            // If profile doesn't exist or error, sign out and show error
            await supabase.auth.signOut();
            setError('Benutzerprofil konnte nicht gefunden werden. Bitte kontaktieren Sie den Administrator.');
            setLoading(false);
            return;
        }

        // Check if user has admin or superadmin role
        if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
            // User is not an admin, sign out and show error
            await supabase.auth.signOut();
            setError('Sie haben keine Administratorberechtigung. Zugang verweigert.');
            setLoading(false);
            return;
        }

        // Success - redirect to dashboard
        router.push('/admin/dashboard');
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'var(--gradient-earth)' }}
        >
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                {/* Saffron Blob */}
                <div
                    className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-30 animate-float"
                    style={{ background: 'var(--saffron)' }}
                />
                {/* Terracotta Blob */}
                <div
                    className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full blur-3xl opacity-25"
                    style={{ background: 'var(--terracotta)', animationDelay: '2s' }}
                />
                {/* Cardamom Blob */}
                <div
                    className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-20"
                    style={{ background: 'var(--cardamom)' }}
                />
                {/* Dot Pattern Overlay */}
                <div className="absolute inset-0 dot-pattern opacity-30" />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                <div className="glass-card p-8 sm:p-10 shadow-2xl animate-fade-in-up">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style={{ background: 'var(--gradient-warm)' }}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <h1
                            className="text-3xl font-bold mb-2 text-gradient-warm"
                            style={{ fontFamily: 'var(--font-playfair)' }}
                        >
                            Admin Portal
                        </h1>
                        <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                            Willkommen bei Bereket Market
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            className="mb-6 p-4 rounded-xl text-sm animate-fade-in-up"
                            style={{
                                background: 'rgba(216, 99, 78, 0.1)',
                                border: '1px solid var(--terracotta)',
                                color: 'var(--terracotta-dark)'
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-semibold mb-2"
                                style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                            >
                                E-Mail Adresse
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@bereket.market"
                                required
                                className="w-full px-4 py-3.5 rounded-xl text-base transition-all"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    border: '2px solid var(--sand)',
                                    color: 'var(--charcoal)',
                                    fontFamily: 'var(--font-outfit)'
                                }}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-semibold mb-2"
                                style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                            >
                                Passwort
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3.5 rounded-xl text-base transition-all"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    border: '2px solid var(--sand)',
                                    color: 'var(--charcoal)',
                                    fontFamily: 'var(--font-outfit)'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ fontFamily: 'var(--font-outfit)' }}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Wird angemeldet...</span>
                                </>
                            ) : (
                                <>
                                    <span>Anmelden</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Note */}
                    <p className="text-center text-sm mt-6" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                        Nur für autorisierte Administratoren
                    </p>
                </div>

                {/* Brand Footer */}
                <p
                    className="text-center text-sm mt-6 opacity-60"
                    style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}
                >
                    © {new Date().getFullYear()} Bereket Market
                </p>
            </div>
        </div>
    );
}
