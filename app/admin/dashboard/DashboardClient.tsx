'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { MarketManager, TeamManagement, Toast } from './components';
import { Market, TeamMember, UserRole, ToastState } from './components/types';

interface DashboardClientProps {
    initialMarkets: Market[];
    userEmail: string;
    initialTotalCount: number;
    userRole: UserRole;
    userId: string;
    initialTeamMembers: TeamMember[];
    initialUsers: TeamMember[];
}

// Tab type for navigation
type DashboardTab = 'markets' | 'team';

export default function DashboardClient({
    initialMarkets,
    userEmail,
    initialTotalCount,
    userRole,
    userId,
    initialTeamMembers,
    initialUsers
}: DashboardClientProps) {
    // Tab navigation state
    const [activeTab, setActiveTab] = useState<DashboardTab>('markets');

    // Toast notification state
    const [toast, setToast] = useState<ToastState | null>(null);

    // Password change state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    // Auto-hide toast after 3 seconds
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            showToast('Das Passwort muss mindestens 8 Zeichen lang sein.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Die Passwörter stimmen nicht überein.', 'error');
            return;
        }

        setUpdatingPassword(true);

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            showToast('Fehler beim Aktualisieren des Passworts: ' + error.message, 'error');
        } else {
            showToast('Passwort erfolgreich aktualisiert!', 'success');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(false);
        }

        setUpdatingPassword(false);
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--gradient-earth)' }}>
            {/* Toast Notification */}
            <Toast toast={toast} onClose={() => setToast(null)} />

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                    <div className="glass-card w-full max-w-md p-8 animate-scale-in" style={{ borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.5)' }}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 rounded-2xl shadow-sm" style={{ background: 'rgba(230, 168, 69, 0.15)' }}>
                                    <svg className="w-6 h-6" fill="none" stroke="var(--saffron)" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Passwort ändern
                                </h3>
                            </div>
                            <button onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }} className="p-2.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer text-[var(--warm-gray)] hover:text-[var(--charcoal)]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handlePasswordUpdate} className="space-y-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold mb-2 ml-1" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Neues Passwort</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mindestens 8 Zeichen" required className="w-full px-5 py-4 rounded-xl transition-all focus:ring-4 focus:ring-[var(--saffron-glow)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2 ml-1" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Passwort bestätigen</label>
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Passwort erneut eingeben" required className="w-full px-5 py-4 rounded-xl transition-all focus:ring-4 focus:ring-[var(--saffron-glow)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }} className="flex-1 py-4 rounded-xl font-bold transition-all hover:bg-black/5 cursor-pointer" style={{ background: 'transparent', color: 'var(--warm-gray)', border: '2px solid var(--sand)', fontFamily: 'var(--font-outfit)' }}>Abbrechen</button>
                                <button type="submit" disabled={updatingPassword} className="flex-[2] btn-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]" style={{ fontFamily: 'var(--font-outfit)' }}>
                                    {updatingPassword ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg><span>Wird aktualisiert...</span></> : <span>Passwort aktualisieren</span>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Admin Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(250, 247, 242, 0.9)', borderColor: 'var(--sand)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ background: 'var(--gradient-warm)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Admin Dashboard</h1>
                                <p className="text-xs" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Bereket Market</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--sand)' }}>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase" style={{ background: userRole === 'superadmin' ? 'var(--saffron)' : 'var(--warm-gray)', color: 'white', fontFamily: 'var(--font-outfit)', letterSpacing: '0.05em' }}>
                                    {userRole === 'superadmin' ? 'Superadmin' : 'Admin'}
                                </span>
                                <span className="text-sm font-medium" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>{userEmail}</span>
                                <button onClick={() => setShowPasswordModal(true)} className="ml-2 p-1.5 rounded-lg hover:bg-[rgba(44,40,35,0.05)] transition-all cursor-pointer" style={{ color: 'var(--warm-gray)' }} title="Passwort ändern">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                            <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 cursor-pointer" style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="hidden sm:inline">Abmelden</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation - Only show if superadmin */}
            {userRole === 'superadmin' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab('markets')} className="px-5 py-2.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-2" style={{ background: activeTab === 'markets' ? 'var(--gradient-warm)' : 'var(--glass-bg)', color: activeTab === 'markets' ? 'white' : 'var(--charcoal)', fontFamily: 'var(--font-outfit)', border: activeTab === 'markets' ? 'none' : '1px solid var(--glass-border)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Market Manager
                        </button>
                        <button onClick={() => setActiveTab('team')} className="px-5 py-2.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-2" style={{ background: activeTab === 'team' ? 'var(--gradient-warm)' : 'var(--glass-bg)', color: activeTab === 'team' ? 'white' : 'var(--charcoal)', fontFamily: 'var(--font-outfit)', border: activeTab === 'team' ? 'none' : '1px solid var(--glass-border)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            Team Verwaltung
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Market Manager Tab Content */}
                {activeTab === 'markets' && (
                    <MarketManager
                        initialMarkets={initialMarkets}
                        initialTotalCount={initialTotalCount}
                        showToast={showToast}
                    />
                )}

                {/* Team Verwaltung Tab Content - Superadmin Only */}
                {activeTab === 'team' && userRole === 'superadmin' && (
                    <TeamManagement
                        userId={userId}
                        initialTeamMembers={initialTeamMembers}
                        initialUsers={initialUsers}
                        showToast={showToast}
                    />
                )}
            </main>
        </div>
    );
}
