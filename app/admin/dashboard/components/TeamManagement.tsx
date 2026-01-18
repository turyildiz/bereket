'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TeamMember, UserRole } from './types';

interface TeamManagementProps {
    userId: string;
    initialTeamMembers: TeamMember[];
    initialUsers: TeamMember[];
    showToast: (message: string, type: 'success' | 'error') => void;
}

const USERS_PER_PAGE = 20;

export default function TeamManagement({
    userId,
    initialTeamMembers,
    initialUsers,
    showToast
}: TeamManagementProps) {
    // Team management state
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
    const [demoteConfirm, setDemoteConfirm] = useState<string | null>(null);
    const [demotingUser, setDemotingUser] = useState(false);

    // User Directory state
    const [users, setUsers] = useState<TeamMember[]>(initialUsers);
    const [usersSearchQuery, setUsersSearchQuery] = useState('');
    const [usersDebouncedQuery, setUsersDebouncedQuery] = useState('');
    const [usersCurrentPage, setUsersCurrentPage] = useState(1);
    const [usersTotalCount, setUsersTotalCount] = useState(0);
    const [usersSearchLoading, setUsersSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [promotingToAdmin, setPromotingToAdmin] = useState(false);

    // Delete user state
    const [deleteConfirmActive, setDeleteConfirmActive] = useState(false);
    const [deletingUser, setDeletingUser] = useState(false);
    const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Create user state
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [createUserEmail, setCreateUserEmail] = useState('');
    const [createUserPassword, setCreateUserPassword] = useState('');
    const [creatingUser, setCreatingUser] = useState(false);

    const supabase = createClient();

    // Debounce user search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setUsersDebouncedQuery(usersSearchQuery);
            setUsersCurrentPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [usersSearchQuery]);

    // Fetch users with search and pagination
    const fetchUsers = useCallback(async (query: string, page: number) => {
        setUsersSearchLoading(true);

        const start = (page - 1) * USERS_PER_PAGE;
        const end = start + USERS_PER_PAGE - 1;

        try {
            let dataQuery = supabase
                .from('profiles')
                .select('*', { count: 'exact' })
                .eq('role', 'user');

            if (query.trim()) {
                dataQuery = dataQuery.ilike('email', `%${query}%`);
            }

            dataQuery = dataQuery
                .order('created_at', { ascending: false })
                .range(start, end);

            const { data, error, count } = await dataQuery;

            if (error) {
                console.error('Error fetching users:', error);
                showToast('Fehler beim Laden der Benutzer: ' + error.message, 'error');
            } else {
                setUsers(data || []);
                setUsersTotalCount(count || 0);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setUsersSearchLoading(false);
        }
    }, [supabase, showToast]);

    // Fetch users when debounced query or page changes
    useEffect(() => {
        fetchUsers(usersDebouncedQuery, usersCurrentPage);
    }, [usersDebouncedQuery, usersCurrentPage, fetchUsers]);

    // Calculate total pages for users
    const usersTotalPages = Math.ceil(usersTotalCount / USERS_PER_PAGE);

    // Users pagination handlers
    const goToNextUsersPage = () => {
        if (usersCurrentPage < usersTotalPages) {
            setUsersCurrentPage(prev => prev + 1);
        }
    };

    const goToPreviousUsersPage = () => {
        if (usersCurrentPage > 1) {
            setUsersCurrentPage(prev => prev - 1);
        }
    };

    // FIXED: Demote admin to regular user - "Rolle entziehen"
    const handleDemoteAdmin = async (memberId: string) => {
        console.log('[TeamManagement] handleDemoteAdmin called with memberId:', memberId);

        // Prevent self-demotion
        if (memberId === userId) {
            console.log('[TeamManagement] Attempted self-demotion, blocking');
            showToast('Sie können sich nicht selbst herabstufen.', 'error');
            setDemoteConfirm(null);
            return;
        }

        // Find the member to check their role
        const member = teamMembers.find(m => m.id === memberId);
        console.log('[TeamManagement] Found member:', member);

        if (!member) {
            console.log('[TeamManagement] Member not found in teamMembers list');
            showToast('Teammitglied nicht gefunden.', 'error');
            setDemoteConfirm(null);
            return;
        }

        // Prevent demoting superadmins
        if (member.role === 'superadmin') {
            console.log('[TeamManagement] Attempted to demote superadmin, blocking');
            showToast('Superadmins können nicht herabgestuft werden.', 'error');
            setDemoteConfirm(null);
            return;
        }

        setDemotingUser(true);

        try {
            console.log('[TeamManagement] Attempting to update role to "user" for id:', memberId);

            // Perform the database update
            const { data: updateData, error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'user' })
                .eq('id', memberId)
                .select()
                .single();

            console.log('[TeamManagement] Demote update result:', { updateData, updateError });

            if (updateError) {
                console.error('[TeamManagement] Database error demoting admin:', updateError);
                showToast('Fehler beim Herabstufen: ' + updateError.message, 'error');
            } else {
                console.log('[TeamManagement] Successfully demoted admin, removing from team list');

                // Remove from team members list
                setTeamMembers(prev => prev.filter(m => m.id !== memberId));

                // Add back to users list
                const demotedUser: TeamMember = {
                    ...member,
                    role: 'user'
                };
                setUsers(prev => [demotedUser, ...prev]);

                showToast('Admin-Rechte erfolgreich entzogen.', 'success');
            }
        } catch (err) {
            console.error('[TeamManagement] Unexpected error demoting admin:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setDemotingUser(false);
            setDemoteConfirm(null);
        }
    };

    // User modal handlers
    const handleOpenUserModal = (user: TeamMember) => {
        setSelectedUser(user);
        setShowUserModal(true);
    };

    const handleCloseUserModal = () => {
        setSelectedUser(null);
        setShowUserModal(false);
        setDeleteConfirmActive(false);
        if (deleteTimeoutRef.current) {
            clearTimeout(deleteTimeoutRef.current);
            deleteTimeoutRef.current = null;
        }
    };

    // Two-step delete confirmation handler
    const handleDeleteClick = () => {
        if (deleteConfirmActive) {
            // Second click - actually delete
            handleDeleteUser();
        } else {
            // First click - show confirmation
            setDeleteConfirmActive(true);
            // Auto-reset after 5 seconds
            deleteTimeoutRef.current = setTimeout(() => {
                setDeleteConfirmActive(false);
            }, 5000);
        }
    };

    // Reset delete confirmation when clicking elsewhere
    const handleModalContentClick = (e: React.MouseEvent) => {
        // Only reset if not clicking the delete button itself
        const target = e.target as HTMLElement;
        if (!target.closest('[data-delete-button]')) {
            setDeleteConfirmActive(false);
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
                deleteTimeoutRef.current = null;
            }
        }
    };

    // Delete user from database
    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        console.log('[TeamManagement] Deleting user:', selectedUser.id);
        setDeletingUser(true);

        try {
            const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', selectedUser.id);

            console.log('[TeamManagement] Delete result:', { deleteError });

            if (deleteError) {
                console.error('[TeamManagement] Error deleting user:', deleteError);
                showToast('Fehler beim Löschen: ' + deleteError.message, 'error');
            } else {
                console.log('[TeamManagement] Successfully deleted user');

                // Remove from users list
                setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
                setUsersTotalCount(prev => prev - 1);

                showToast('Benutzer erfolgreich gelöscht.', 'success');
                handleCloseUserModal();
            }
        } catch (err) {
            console.error('[TeamManagement] Unexpected error deleting user:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setDeletingUser(false);
            setDeleteConfirmActive(false);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current);
            }
        };
    }, []);

    // FIXED: Promote user to admin from modal
    const handlePromoteToAdminFromModal = async () => {
        if (!selectedUser) {
            console.log('[TeamManagement] No selected user for modal promotion');
            return;
        }

        console.log('[TeamManagement] Promoting user from modal:', selectedUser);
        setPromotingToAdmin(true);

        try {
            const { data: updateData, error: updateError } = await supabase
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', selectedUser.id)
                .select()
                .single();

            console.log('[TeamManagement] Modal promote result:', { updateData, updateError });

            if (updateError) {
                console.error('[TeamManagement] Error promoting user from modal:', updateError);
                showToast('Fehler beim Hochstufen: ' + updateError.message, 'error');
            } else {
                console.log('[TeamManagement] Successfully promoted user from modal');

                // Add to team members list
                const newMember: TeamMember = {
                    id: selectedUser.id,
                    email: selectedUser.email,
                    role: 'admin',
                    created_at: selectedUser.created_at
                };
                setTeamMembers(prev => [...prev, newMember]);

                // Remove from users list
                setUsers(prev => prev.filter(u => u.id !== selectedUser.id));

                showToast('Benutzer erfolgreich zum Admin hochgestuft!', 'success');
                handleCloseUserModal();
            }
        } catch (err) {
            console.error('[TeamManagement] Unexpected error in modal promotion:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setPromotingToAdmin(false);
        }
    };

    // Create new user handler
    const handleCreateUser = async () => {
        if (!createUserEmail.trim() || !createUserPassword.trim()) {
            showToast('Bitte Email und Passwort eingeben.', 'error');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(createUserEmail)) {
            showToast('Bitte eine gültige Email-Adresse eingeben.', 'error');
            return;
        }

        // Password validation (minimum 6 characters as per Supabase default)
        if (createUserPassword.length < 6) {
            showToast('Passwort muss mindestens 6 Zeichen lang sein.', 'error');
            return;
        }

        console.log('[TeamManagement] Creating user:', createUserEmail);
        setCreatingUser(true);

        try {
            const response = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: createUserEmail,
                    password: createUserPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[TeamManagement] Error from API:', data.error);
                showToast('Fehler beim Erstellen: ' + data.error, 'error');
                return;
            }

            console.log('[TeamManagement] User created successfully:', data.user);

            // Add to users list
            const newUser: TeamMember = {
                id: data.user.id,
                email: data.user.email,
                role: 'user',
                created_at: data.user.created_at || new Date().toISOString(),
            };
            setUsers(prev => [newUser, ...prev]);
            setUsersTotalCount(prev => prev + 1);

            showToast('Benutzer erfolgreich erstellt!', 'success');
            setShowCreateUserModal(false);
            setCreateUserEmail('');
            setCreateUserPassword('');
        } catch (err) {
            console.error('[TeamManagement] Unexpected error creating user:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setCreatingUser(false);
        }
    };


    return (
        <>
            {/* User Detail Modal */}
            {showUserModal && selectedUser && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                    <div className="glass-card w-full max-w-md p-0 animate-scale-in overflow-hidden shadow-2xl" onClick={handleModalContentClick} style={{ borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.5)' }}>

                        {/* Header Banner */}
                        <div className="relative h-32 w-full" style={{ background: 'var(--gradient-earth)' }}>
                            <div className="absolute inset-0 opacity-20 grain-texture"></div>
                            <button onClick={handleCloseUserModal} className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer z-10 backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.3)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--charcoal)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Profile Content */}
                        <div className="px-8 pb-8 -mt-16 flex flex-col items-center relative z-10">

                            {/* Avatar */}
                            <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-white font-bold text-5xl shadow-xl mb-4 border-4 border-white transform hover:scale-105 transition-transform duration-500"
                                style={{ background: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>
                                {selectedUser.email.charAt(0).toUpperCase()}
                            </div>

                            {/* Email & Role */}
                            <h3 className="text-xl font-bold text-center mb-2 break-all" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                {selectedUser.email}
                            </h3>
                            <span className="px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 shadow-sm"
                                style={{ background: 'var(--sand)', color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                Benutzer
                            </span>

                            {/* Details Box */}
                            <div className="w-full rounded-2xl p-6 mb-8 space-y-4 shadow-inner" style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                <div className="flex justify-between items-center border-b border-black/5 pb-3">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[var(--warm-gray)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-sm font-medium" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Registriert am</span>
                                    </div>
                                    <span className="text-sm font-bold" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        {new Date(selectedUser.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[var(--warm-gray)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>User ID</span>
                                    </div>
                                    <code className="text-xs p-3 rounded-xl block w-full overflow-hidden text-ellipsis font-mono select-all transition-colors hover:bg-white/80"
                                        style={{ color: 'var(--charcoal)', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                        {selectedUser.id}
                                    </code>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="w-full space-y-3">
                                <button
                                    onClick={handlePromoteToAdminFromModal}
                                    disabled={promotingToAdmin}
                                    className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                    style={{ fontFamily: 'var(--font-outfit)' }}
                                >
                                    {promotingToAdmin ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Wird hochgestuft...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Zum Admin machen</span>
                                        </>
                                    )}
                                </button>

                                {/* Delete Button - Hidden if user is the current superadmin */}
                                {selectedUser.id !== userId && (
                                    <button
                                        data-delete-button
                                        onClick={handleDeleteClick}
                                        disabled={deletingUser}
                                        className="w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer hover:bg-[rgba(216,99,78,0.08)] active:scale-[0.98]"
                                        style={{
                                            background: deleteConfirmActive ? 'var(--terracotta)' : 'transparent',
                                            color: deleteConfirmActive ? 'white' : 'var(--terracotta)',
                                            border: deleteConfirmActive ? 'none' : '2px solid rgba(216, 99, 78, 0.2)',
                                            fontFamily: 'var(--font-outfit)'
                                        }}
                                    >
                                        {deletingUser ? (
                                            <>
                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span>Wird gelöscht...</span>
                                            </>
                                        ) : deleteConfirmActive ? (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span>Ja, endgültig löschen</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                <span>Benutzer löschen</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-[var(--sand)] p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Team Verwaltung</h1>
                        <p className="text-base" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>{teamMembers.length} {teamMembers.length === 1 ? 'Teammitglied' : 'Teammitglieder'}</p>
                    </div>
                    <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-105 hover:shadow-xl cursor-pointer flex items-center gap-3 shadow-lg whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, var(--cardamom) 0%, rgba(107, 142, 122, 0.85) 100%)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Benutzer erstellen
                    </button>
                </div>
            </div>

            {/* Superadmin Card (Pinned at top, no buttons) */}
            {teamMembers.filter(m => m.role === 'superadmin').map((superadmin) => (
                <div key={superadmin.id} className="glass-card p-5 mb-6 flex items-center gap-4 border-2" style={{ borderColor: 'var(--saffron)' }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: 'var(--gradient-warm)', fontFamily: 'var(--font-outfit)' }}>
                        {superadmin.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)', fontSize: '16px' }}>{superadmin.email}</span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ background: 'var(--saffron)', color: 'white', fontFamily: 'var(--font-outfit)', letterSpacing: '0.05em' }}>Superadmin</span>
                            {superadmin.id === userId && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(107, 142, 122, 0.15)', color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>Sie</span>}
                        </div>
                        <p className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Beigetreten: {new Date(superadmin.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
            ))}

            {/* Aktuelle Admins Section */}
            <div className="mb-8">
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Aktuelle Admins</h3>
                {teamMembers.filter(m => m.role === 'admin').length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Keine Admins vorhanden.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {teamMembers.filter(m => m.role === 'admin').map((admin) => (
                            <div key={admin.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        {admin.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>{admin.email}</span>
                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase" style={{ background: 'var(--warm-gray)', color: 'white', fontFamily: 'var(--font-outfit)', letterSpacing: '0.05em' }}>Admin</span>
                                            {admin.id === userId && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(107, 142, 122, 0.15)', color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>Sie</span>}
                                        </div>
                                        <p className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Beigetreten: {new Date(admin.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                {admin.id !== userId && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setDemoteConfirm(demoteConfirm === admin.id ? null : admin.id)}
                                            disabled={demotingUser}
                                            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer hover:opacity-80 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                            Rolle entziehen
                                        </button>
                                        {demoteConfirm === admin.id && (
                                            <div className="absolute bottom-full right-0 mb-2 glass-card p-3 shadow-lg z-10" style={{ minWidth: '200px' }}>
                                                <p className="text-xs mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Admin-Rechte entziehen?</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setDemoteConfirm(null)}
                                                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-70 cursor-pointer"
                                                        style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        Abbrechen
                                                    </button>
                                                    <button
                                                        onClick={() => handleDemoteAdmin(admin.id)}
                                                        disabled={demotingUser}
                                                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                                        style={{ background: 'var(--terracotta)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        {demotingUser ? (
                                                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
                                                        ) : 'Ja, entziehen'}
                                                    </button>
                                                </div>
                                                <div className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45" style={{ background: 'white' }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Benutzer-Verzeichnis (User Directory) */}
            <div>
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Benutzer-Verzeichnis</h3>

                {/* Search Bar */}
                <div className="relative glass-card overflow-hidden mb-4" style={{ border: '2px solid var(--saffron)', boxShadow: '0 0 20px rgba(230, 168, 69, 0.15)' }}>
                    <div className="flex items-center">
                        <div className="pl-5 pr-3">
                            {usersSearchLoading ? (
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </div>
                        <input type="text" value={usersSearchQuery} onChange={(e) => setUsersSearchQuery(e.target.value)} placeholder="Nach E-Mail suchen..." className="flex-1 py-3 pr-4 bg-transparent outline-none" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)', fontSize: '15px' }} />
                        {usersSearchQuery && (
                            <button onClick={() => { setUsersSearchQuery(''); setUsersDebouncedQuery(''); }} className="px-3 py-1.5 mr-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center gap-1" style={{ background: 'rgba(230, 168, 69, 0.1)', color: 'var(--saffron-dark)', fontFamily: 'var(--font-outfit)' }}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Löschen
                            </button>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--gradient-warm)' }} />
                </div>

                {/* Users List */}
                {users.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--warm-gray)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Keine Benutzer gefunden</h3>
                        <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>{usersDebouncedQuery ? 'Keine Ergebnisse für Ihre Suche.' : 'Noch keine Benutzer registriert.'}</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div key={user.id} onClick={() => handleOpenUserModal(user)} className="glass-card p-4 flex items-center justify-between gap-4 cursor-pointer hover:shadow-lg transition-all" style={{ border: '1px solid transparent' }}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="font-semibold" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>{user.email}</span>
                                            <p className="text-xs" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Registriert: {new Date(user.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(107, 142, 122, 0.1)' }}>
                                        <svg className="w-4 h-4" fill="none" stroke="var(--cardamom)" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {usersTotalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between gap-4">
                                <div className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Seite {usersCurrentPage} von {usersTotalPages}<span className="mx-2">•</span>{usersTotalCount} Benutzer
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={goToPreviousUsersPage} disabled={usersCurrentPage === 1} className="px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" style={{ background: usersCurrentPage === 1 ? 'var(--sand)' : 'white', color: 'var(--charcoal)', border: '2px solid var(--sand)', fontFamily: 'var(--font-outfit)' }}>
                                        Zurück
                                    </button>
                                    <button onClick={goToNextUsersPage} disabled={usersCurrentPage === usersTotalPages} className="px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" style={{ background: usersCurrentPage === usersTotalPages ? 'var(--sand)' : 'var(--gradient-warm)', color: usersCurrentPage === usersTotalPages ? 'var(--charcoal)' : 'white', fontFamily: 'var(--font-outfit)' }}>
                                        Weiter
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateUserModal && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                    <div className="glass-card w-full max-w-md p-0 animate-scale-in overflow-hidden shadow-2xl" style={{ borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.5)' }}>

                        {/* Header */}
                        <div className="relative px-8 py-6 border-b" style={{ borderColor: 'var(--sand)' }}>
                            <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                Neuen Benutzer erstellen
                            </h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                Erstellen Sie einen neuen Benutzer-Account
                            </p>
                            <button
                                onClick={() => {
                                    setShowCreateUserModal(false);
                                    setCreateUserEmail('');
                                    setCreateUserPassword('');
                                }}
                                className="absolute top-6 right-6 p-2.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--charcoal)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form */}
                        <div className="p-8 space-y-6">
                            {/* Email Field */}
                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                    Email-Adresse
                                </label>
                                <input
                                    type="email"
                                    value={createUserEmail}
                                    onChange={(e) => setCreateUserEmail(e.target.value)}
                                    placeholder="benutzer@example.com"
                                    className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-[var(--cardamom)]/20"
                                    style={{ borderColor: 'var(--sand)', fontFamily: 'var(--font-outfit)' }}
                                    disabled={creatingUser}
                                />
                            </div>

                            {/* Password Field */}
                            <div>
                                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                    Passwort
                                </label>
                                <input
                                    type="password"
                                    value={createUserPassword}
                                    onChange={(e) => setCreateUserPassword(e.target.value)}
                                    placeholder="Mindestens 6 Zeichen"
                                    className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-4 focus:ring-[var(--cardamom)]/20"
                                    style={{ borderColor: 'var(--sand)', fontFamily: 'var(--font-outfit)' }}
                                    disabled={creatingUser}
                                />
                                <p className="text-xs mt-2" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    💡 Das Passwort muss mindestens 6 Zeichen lang sein
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowCreateUserModal(false);
                                        setCreateUserEmail('');
                                        setCreateUserPassword('');
                                    }}
                                    disabled={creatingUser}
                                    className="flex-1 py-3 rounded-xl font-bold transition-all hover:opacity-80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={handleCreateUser}
                                    disabled={creatingUser || !createUserEmail.trim() || !createUserPassword.trim()}
                                    className="flex-1 py-3 rounded-xl font-bold transition-all hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, var(--cardamom) 0%, rgba(107, 142, 122, 0.85) 100%)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                                >
                                    {creatingUser ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Wird erstellt...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span>Benutzer erstellen</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
