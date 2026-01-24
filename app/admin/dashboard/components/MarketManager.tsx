'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createMarket, updateMarket, updateMarketStatus, deleteMarket, seedSampleMarkets } from '@/app/actions/markets';
import { getSignedUploadUrl } from '@/app/actions/storage';
import { Market, MarketFormData } from './types';

interface MarketManagerProps {
    initialMarkets: Market[];
    initialTotalCount: number;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const ITEMS_PER_PAGE = 15;

export default function MarketManager({
    initialMarkets,
    initialTotalCount,
    showToast
}: MarketManagerProps) {
    const [markets, setMarkets] = useState<Market[]>(initialMarkets);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);

    // Search and Pagination state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [searchLoading, setSearchLoading] = useState(false);

    // Edit mode state
    const [editingMarket, setEditingMarket] = useState<Market | null>(null);

    const [formData, setFormData] = useState<MarketFormData>({
        slug: '',
        name: '',
        city: '',
        zip_code: '',
        full_address: '',
        latitude: '',
        longitude: '',
        customer_phone: '',
        whatsapp_numbers: [''],
        header_url: '',
        logo_url: '',
        about_text: '',
        features: [''],
        opening_hours: [{ day: '', time: '' }],
        is_premium: false,
    });

    // File upload state
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [headerFile, setHeaderFile] = useState<File | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingHeader, setUploadingHeader] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const headerInputRef = useRef<HTMLInputElement>(null);

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Activation/Deactivation confirmation state
    const [toggleActiveConfirm, setToggleActiveConfirm] = useState<{ id: string; currentStatus: boolean } | null>(null);

    // Seed confirmation state
    const [showSeedConfirm, setShowSeedConfirm] = useState(false);

    const supabase = createClient();

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch markets with search and pagination
    const fetchMarkets = useCallback(async (query: string, page: number) => {
        setSearchLoading(true);

        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE - 1;

        try {
            let dataQuery = supabase
                .from('markets')
                .select('*', { count: 'exact' });

            if (query.trim()) {
                dataQuery = dataQuery.or(`name.ilike.%${query}%,city.ilike.%${query}%`);
            }

            dataQuery = dataQuery
                .order('is_active', { ascending: false })
                .order('is_premium', { ascending: false })
                .order('created_at', { ascending: false })
                .range(start, end);

            const { data, error, count } = await dataQuery;

            if (error) {
                console.error('Error fetching markets:', error);
                showToast('Fehler beim Laden der Märkte: ' + error.message, 'error');
            } else {
                setMarkets(data || []);
                setTotalCount(count || 0);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setSearchLoading(false);
        }
    }, [supabase, showToast]);

    // Track if initial load has been done
    const isInitialMount = useRef(true);

    // Fetch markets when debounced query or page changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        fetchMarkets(debouncedQuery, currentPage);
    }, [debouncedQuery, currentPage, fetchMarkets]);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    // Pagination handlers
    const goToNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedQuery('');
        setCurrentPage(1);
    };

    // Form handlers
    const handleAddWhatsApp = () => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: [...prev.whatsapp_numbers, '']
        }));
    };

    const handleRemoveWhatsApp = (index: number) => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: prev.whatsapp_numbers.filter((_, i) => i !== index)
        }));
    };

    const handleWhatsAppChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: prev.whatsapp_numbers.map((num, i) => i === index ? value : num)
        }));
    };

    const handleAddFeature = () => {
        setFormData(prev => ({
            ...prev,
            features: [...prev.features, '']
        }));
    };

    const handleRemoveFeature = (index: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const handleFeatureChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features.map((feat, i) => i === index ? value : feat)
        }));
    };

    const handleAddOpeningHour = () => {
        setFormData(prev => ({
            ...prev,
            opening_hours: [...prev.opening_hours, { day: '', time: '' }]
        }));
    };

    const handleRemoveOpeningHour = (index: number) => {
        setFormData(prev => ({
            ...prev,
            opening_hours: prev.opening_hours.filter((_, i) => i !== index)
        }));
    };

    const handleOpeningHourChange = (index: number, field: 'day' | 'time', value: string) => {
        setFormData(prev => ({
            ...prev,
            opening_hours: prev.opening_hours.map((hour, i) =>
                i === index ? { ...hour, [field]: value } : hour
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const filteredNumbers = formData.whatsapp_numbers.filter(num => num.trim() !== '');
        const filteredFeatures = formData.features.filter(feat => feat.trim() !== '');
        const filteredOpeningHours = formData.opening_hours.filter(hour => hour.day.trim() !== '' && hour.time.trim() !== '');

        // NORMALIZE WHATSAPP NUMBERS: Remove '+' prefix for consistent webhook matching
        const normalizedNumbers = filteredNumbers.map(num => num.replace(/^\+/, '').trim());

        let finalLogoUrl = formData.logo_url || null;
        let finalHeaderUrl = formData.header_url || null;

        if (logoFile) {
            setUploadingLogo(true);

            // Get signed upload URL from server action
            const uploadResult = await getSignedUploadUrl(logoFile.name, logoFile.type, 'market-assets');

            if (!uploadResult.success || !uploadResult.signedUrl || !uploadResult.publicUrl) {
                showToast('Fehler beim Logo-Upload: ' + (uploadResult.error || 'Keine Upload-URL erhalten'), 'error');
                setLoading(false);
                setUploadingLogo(false);
                return;
            }

            // Upload file directly to signed URL
            const uploadResponse = await fetch(uploadResult.signedUrl, {
                method: 'PUT',
                body: logoFile,
                headers: {
                    'Content-Type': logoFile.type,
                },
            });

            if (!uploadResponse.ok) {
                showToast('Fehler beim Logo-Upload: Upload fehlgeschlagen', 'error');
                setLoading(false);
                setUploadingLogo(false);
                return;
            }

            finalLogoUrl = uploadResult.publicUrl;
            setUploadingLogo(false);
        }

        if (headerFile) {
            setUploadingHeader(true);

            // Get signed upload URL from server action
            const uploadResult = await getSignedUploadUrl(headerFile.name, headerFile.type, 'market-assets');

            if (!uploadResult.success || !uploadResult.signedUrl || !uploadResult.publicUrl) {
                showToast('Fehler beim Header-Upload: ' + (uploadResult.error || 'Keine Upload-URL erhalten'), 'error');
                setLoading(false);
                setUploadingHeader(false);
                return;
            }

            // Upload file directly to signed URL
            const uploadResponse = await fetch(uploadResult.signedUrl, {
                method: 'PUT',
                body: headerFile,
                headers: {
                    'Content-Type': headerFile.type,
                },
            });

            if (!uploadResponse.ok) {
                showToast('Fehler beim Header-Upload: Upload fehlgeschlagen', 'error');
                setLoading(false);
                setUploadingHeader(false);
                return;
            }

            finalHeaderUrl = uploadResult.publicUrl;
            setUploadingHeader(false);
        }

        const marketData = {
            slug: formData.slug,
            name: formData.name,
            city: formData.city,
            zip_code: formData.zip_code || null,
            full_address: formData.full_address,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            customer_phone: formData.customer_phone || null,
            whatsapp_numbers: normalizedNumbers,
            header_url: finalHeaderUrl,
            logo_url: finalLogoUrl,
            about_text: formData.about_text || null,
            features: filteredFeatures.length > 0 ? filteredFeatures : null,
            opening_hours: filteredOpeningHours.length > 0 ? filteredOpeningHours : null,
            is_premium: formData.is_premium,
        };

        if (editingMarket) {
            const result = await updateMarket(editingMarket.id, marketData);

            if (!result.success) {
                showToast('Fehler beim Speichern: ' + result.error, 'error');
            } else {
                await fetchMarkets(debouncedQuery, currentPage);
                resetForm();
                showToast('Änderungen erfolgreich gespeichert!', 'success');
            }
        } else {
            const result = await createMarket(marketData);

            if (!result.success) {
                showToast('Fehler beim Erstellen: ' + result.error, 'error');
            } else {
                setCurrentPage(1);
                await fetchMarkets(debouncedQuery, 1);
                resetForm();
                showToast('Markt erfolgreich erstellt!', 'success');
            }
        }
        setLoading(false);
    };

    const resetForm = () => {
        setFormData({
            slug: '',
            name: '',
            city: '',
            zip_code: '',
            full_address: '',
            latitude: '',
            longitude: '',
            customer_phone: '',
            whatsapp_numbers: [''],
            header_url: '',
            logo_url: '',
            about_text: '',
            features: [''],
            opening_hours: [{ day: '', time: '' }],
            is_premium: false,
        });
        setLogoFile(null);
        setHeaderFile(null);
        setEditingMarket(null);
        setShowCreateForm(false);
    };

    const handleEditMarket = (market: Market) => {
        setEditingMarket(market);
        setFormData({
            slug: market.slug || '',
            name: market.name,
            city: market.city || '',
            zip_code: market.zip_code || '',
            full_address: market.full_address || '',
            latitude: market.latitude?.toString() || '',
            longitude: market.longitude?.toString() || '',
            customer_phone: market.customer_phone || '',
            whatsapp_numbers: market.whatsapp_numbers?.length > 0 ? market.whatsapp_numbers : [''],
            header_url: market.header_url || '',
            logo_url: market.logo_url || '',
            about_text: market.about_text || '',
            features: market.features?.length ? market.features : [''],
            opening_hours: market.opening_hours?.length ? market.opening_hours : [{ day: '', time: '' }],
            is_premium: market.is_premium || false,
        });
        setLogoFile(null);
        setHeaderFile(null);
        setShowCreateForm(true);
    };

    const handleDeleteMarket = async (id: string) => {
        const result = await deleteMarket(id);

        if (!result.success) {
            showToast('Fehler beim Löschen: ' + result.error, 'error');
        } else {
            await fetchMarkets(debouncedQuery, currentPage);
            showToast('Markt erfolgreich gelöscht!', 'success');
        }
        setDeleteConfirm(null);
    };

    const handleToggleActive = (id: string, currentStatus: boolean) => {
        // Show confirmation for both activation and deactivation
        setToggleActiveConfirm({ id, currentStatus });
    };

    const performToggleActive = async () => {
        if (!toggleActiveConfirm) return;

        const { id, currentStatus } = toggleActiveConfirm;
        const result = await updateMarketStatus(id, !currentStatus);

        if (!result.success) {
            showToast('Fehler beim Aktualisieren: ' + result.error, 'error');
        } else {
            await fetchMarkets(debouncedQuery, currentPage);
            showToast(`Markt ${!currentStatus ? 'aktiviert' : 'deaktiviert'}!`, 'success');
        }
        setToggleActiveConfirm(null);
    };

    const handleSeedData = async () => {
        setShowSeedConfirm(false);
        setSeeding(true);

        const result = await seedSampleMarkets();

        if (!result.success) {
            showToast(result.error || 'Fehler beim Einfügen der Daten.', 'error');
        } else if (result.error) {
            // Partial success (markets inserted but offers failed)
            showToast(result.error, 'error');
        } else {
            showToast(`Erfolgreich: ${result.marketsInserted} Märkte und ${result.offersInserted} Angebote eingefügt!`, 'success');
        }

        setCurrentPage(1);
        await fetchMarkets(debouncedQuery, 1);
        setSeeding(false);
    };

    return (
        <>
            {/* Seed Data Confirmation Modal */}
            {showSeedConfirm && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                    <div className="glass-card p-6 max-w-md w-full animate-scale-in">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl" style={{ background: 'rgba(107, 142, 122, 0.15)' }}>
                                <svg className="w-6 h-6" fill="none" stroke="var(--cardamom)" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Beispieldaten einfügen?</h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Es werden 3 Beispiel-Märkte mit vollständigem Profil und 9 Angebote in die Datenbank eingefügt.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowSeedConfirm(false)} className="flex-1 py-2.5 rounded-xl font-semibold transition-all hover:opacity-70 cursor-pointer" style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Abbrechen</button>
                                    <button onClick={handleSeedData} className="flex-1 btn-primary py-2.5 cursor-pointer" style={{ fontFamily: 'var(--font-outfit)' }}>Einfügen</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-[var(--sand)] p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Market Manager</h1>
                        <p className="text-base" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>{totalCount} {totalCount === 1 ? 'Markt' : 'Märkte'} registriert{debouncedQuery && ` • Suche: "${debouncedQuery}"`}</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-105 hover:shadow-xl cursor-pointer flex items-center gap-3 shadow-lg whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, var(--terracotta) 0%, rgba(225, 139, 85, 0.85) 100%)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Neuen Markt erstellen
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-8">
                <div className="relative glass-card overflow-hidden" style={{ border: '2px solid var(--saffron)', boxShadow: '0 0 20px rgba(230, 168, 69, 0.15)' }}>
                    <div className="flex items-center">
                        <div className="pl-5 pr-3">
                            {searchLoading ? (
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
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nach Marktname oder Stadt suchen..." className="flex-1 py-4 pr-4 bg-transparent outline-none" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)', fontSize: '16px' }} />
                        {searchQuery && (
                            <button onClick={clearSearch} className="px-4 py-2 mr-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center gap-2" style={{ background: 'rgba(230, 168, 69, 0.1)', color: 'var(--saffron-dark)', fontFamily: 'var(--font-outfit)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Löschen
                            </button>
                        )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--gradient-warm)' }} />
                </div>
            </div>

            {/* Create/Edit Form Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                    <div className="glass-card w-full max-w-3xl p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>{editingMarket ? 'Markt bearbeiten' : 'Neuen Markt erstellen'}</h3>
                            <button onClick={resetForm} className="p-2 rounded-xl hover:opacity-70 transition-opacity cursor-pointer" style={{ background: 'var(--sand)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--charcoal)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Section: Basic Info */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--saffron)', fontFamily: 'var(--font-outfit)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Grundinformationen
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Marktname *</label>
                                        <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="z.B. Istanbul Supermarkt" required className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>URL-Slug *</label>
                                        <input type="text" value={formData.slug} onChange={(e) => { const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); setFormData(prev => ({ ...prev, slug: val })); }} placeholder="z.B. istanbul-supermarkt-frankfurt" required className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                        <p className="text-xs mt-1" style={{ color: 'var(--warm-gray)' }}>Wird für die Shop-URL verwendet: /shop/{formData.slug || 'slug'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>PLZ *</label>
                                            <input type="text" value={formData.zip_code} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 5); setFormData(prev => ({ ...prev, zip_code: val })); }} placeholder="z.B. 60311" required pattern="[0-9]{5}" maxLength={5} className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Stadt *</label>
                                            <input type="text" value={formData.city} onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))} placeholder="z.B. Frankfurt" required className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Adresse *</label>
                                    <input type="text" value={formData.full_address} onChange={(e) => setFormData(prev => ({ ...prev, full_address: e.target.value }))} placeholder="z.B. Musterstraße 123" required className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Telefon (Kundenkontakt)</label>
                                    <input type="tel" value={formData.customer_phone} onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))} placeholder="z.B. +49 69 12345678" className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                </div>

                                {/* WhatsApp Numbers */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>WhatsApp Nummern</label>
                                    <div className="space-y-2">
                                        {formData.whatsapp_numbers.map((num, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input type="tel" value={num} onChange={(e) => handleWhatsAppChange(index, e.target.value)} placeholder="z.B. +49 151 12345678 oder 4915112345678" className="flex-1 px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                                {formData.whatsapp_numbers.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveWhatsApp(index)} className="p-3 rounded-xl transition-all hover:opacity-70 cursor-pointer" style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={handleAddWhatsApp} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center justify-center gap-2" style={{ background: 'rgba(107, 142, 122, 0.1)', color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)', border: '2px dashed var(--cardamom)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Weitere WhatsApp Nummer
                                        </button>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: 'var(--warm-gray)' }}>💡 Tipp: Das '+' wird beim Speichern automatisch entfernt für konsistente Webhook-Erkennung. Mehrere Nummern sind möglich.</p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t" style={{ borderColor: 'var(--sand)' }} />

                            {/* Section: Visuals & Content */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--saffron)', fontFamily: 'var(--font-outfit)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Bilder & Inhalte
                                </h4>

                                {/* Logo Upload */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Logo</label>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <input type="text" value={formData.logo_url} onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))} placeholder="https://... oder Datei hochladen" className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                        </div>
                                        <input type="file" ref={logoInputRef} onChange={(e) => { if (e.target.files?.[0]) { setLogoFile(e.target.files[0]); setFormData(prev => ({ ...prev, logo_url: '' })); } }} accept="image/*" className="hidden" />
                                        <button type="button" onClick={() => logoInputRef.current?.click()} className="px-4 py-3 rounded-xl font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center gap-2" style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <span className="hidden sm:inline">Hochladen</span>
                                        </button>
                                    </div>
                                    {logoFile && (
                                        <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {logoFile.name}
                                            <button type="button" onClick={() => setLogoFile(null)} className="ml-auto text-xs underline cursor-pointer" style={{ color: 'var(--terracotta)' }}>Entfernen</button>
                                        </div>
                                    )}
                                </div>

                                {/* Header Image Upload */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Header Bild</label>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <input type="text" value={formData.header_url} onChange={(e) => setFormData(prev => ({ ...prev, header_url: e.target.value }))} placeholder="https://... oder Datei hochladen" className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                        </div>
                                        <input type="file" ref={headerInputRef} onChange={(e) => { if (e.target.files?.[0]) { setHeaderFile(e.target.files[0]); setFormData(prev => ({ ...prev, header_url: '' })); } }} accept="image/*" className="hidden" />
                                        <button type="button" onClick={() => headerInputRef.current?.click()} className="px-4 py-3 rounded-xl font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center gap-2" style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <span className="hidden sm:inline">Hochladen</span>
                                        </button>
                                    </div>
                                    {headerFile && (
                                        <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {headerFile.name}
                                            <button type="button" onClick={() => setHeaderFile(null)} className="ml-auto text-xs underline cursor-pointer" style={{ color: 'var(--terracotta)' }}>Entfernen</button>
                                        </div>
                                    )}
                                </div>

                                {/* About Text */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Über uns</label>
                                    <textarea value={formData.about_text} onChange={(e) => setFormData(prev => ({ ...prev, about_text: e.target.value }))} placeholder="Beschreiben Sie Ihren Markt, Ihre Geschichte und was Sie besonders macht..." rows={4} className="w-full px-4 py-3 rounded-xl transition-all resize-none focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                </div>

                                {/* Features */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Besonderheiten</label>
                                    <div className="space-y-2">
                                        {formData.features.map((feature, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input type="text" value={feature} onChange={(e) => handleFeatureChange(index, e.target.value)} placeholder="z.B. Halal-zertifiziert, Lieferservice..." className="flex-1 px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                                {formData.features.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveFeature(index)} className="p-3 rounded-xl transition-all hover:opacity-70 cursor-pointer" style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={handleAddFeature} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center justify-center gap-2" style={{ background: 'rgba(107, 142, 122, 0.1)', color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)', border: '2px dashed var(--cardamom)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Weitere Besonderheit
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t" style={{ borderColor: 'var(--sand)' }} />

                            {/* Section: Advanced Data */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--saffron)', fontFamily: 'var(--font-outfit)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Öffnungszeiten & Standort
                                </h4>

                                {/* Opening Hours */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Öffnungszeiten</label>
                                    <div className="space-y-2">
                                        {formData.opening_hours.map((hour, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input type="text" value={hour.day} onChange={(e) => handleOpeningHourChange(index, 'day', e.target.value)} placeholder="z.B. Montag - Freitag" className="flex-1 px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                                <input type="text" value={hour.time} onChange={(e) => handleOpeningHourChange(index, 'time', e.target.value)} placeholder="z.B. 08:00 - 20:00" className="flex-1 px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                                {formData.opening_hours.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveOpeningHour(index)} className="p-3 rounded-xl transition-all hover:opacity-70 cursor-pointer" style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={handleAddOpeningHour} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center justify-center gap-2" style={{ background: 'rgba(107, 142, 122, 0.1)', color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)', border: '2px dashed var(--cardamom)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Weitere Öffnungszeit
                                        </button>
                                    </div>
                                </div>

                                {/* Coordinates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Breitengrad (Latitude)</label>
                                        <input type="number" step="any" value={formData.latitude} onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))} placeholder="z.B. 50.1109" className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Längengrad (Longitude)</label>
                                        <input type="number" step="any" value={formData.longitude} onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))} placeholder="z.B. 8.6821" className="w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]" style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }} />
                                    </div>
                                </div>

                                {/* Premium Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: formData.is_premium ? 'rgba(232, 170, 66, 0.15)' : 'var(--sand)' }}>
                                    <div>
                                        <label className="block text-sm font-semibold" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Premium Partner</label>
                                        <p className="text-xs" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Premium-Badge und bevorzugte Anzeige in den Suchergebnissen</p>
                                    </div>
                                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, is_premium: !prev.is_premium }))} className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 cursor-pointer" style={{ background: formData.is_premium ? 'var(--saffron)' : 'var(--warm-gray)' }}>
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${formData.is_premium ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t" style={{ borderColor: 'var(--sand)' }} />

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-70 cursor-pointer" style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Abbrechen</button>
                                <button type="submit" disabled={loading || uploadingLogo || uploadingHeader} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" style={{ fontFamily: 'var(--font-outfit)' }}>
                                    {(loading || uploadingLogo || uploadingHeader) ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>{uploadingLogo ? 'Logo wird hochgeladen...' : uploadingHeader ? 'Header wird hochgeladen...' : editingMarket ? 'Wird gespeichert...' : 'Wird erstellt...'}</span>
                                        </>
                                    ) : (
                                        <span>{editingMarket ? 'Änderungen speichern' : 'Markt erstellen'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Markets Grid */}
            {markets.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    {debouncedQuery ? (
                        <>
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(230, 168, 69, 0.1)' }}>
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Keine Märkte gefunden</h3>
                            <p className="mb-6" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Keine Ergebnisse für &ldquo;{debouncedQuery}&rdquo;. Versuchen Sie einen anderen Suchbegriff.</p>
                            <button onClick={clearSearch} className="px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-80 cursor-pointer inline-flex items-center gap-2" style={{ background: 'rgba(230, 168, 69, 0.1)', color: 'var(--saffron-dark)', fontFamily: 'var(--font-outfit)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Suche zurücksetzen</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--warm-gray)' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Keine Märkte vorhanden</h3>
                            <p className="mb-6" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>Erstellen Sie Ihren ersten Markt, um loszulegen.</p>
                            <button onClick={() => setShowCreateForm(true)} className="btn-primary px-6 py-3 inline-flex items-center gap-2 cursor-pointer" style={{ fontFamily: 'var(--font-outfit)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Ersten Markt erstellen</span>
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {markets.map((market) => (
                            <div
                                key={market.id}
                                className="glass-card hover-lift overflow-hidden"
                                style={{
                                    opacity: market.is_active ? 1 : 0.6,
                                    filter: market.is_active ? 'none' : 'grayscale(50%)'
                                }}
                            >
                                <div className="h-24 relative" style={{ background: market.is_active ? 'var(--gradient-warm)' : '#9ca3af' }}>
                                    {market.header_url && <img src={market.header_url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: market.is_active ? 1 : 0.5 }} />}
                                    <div className="absolute -bottom-6 left-4">
                                        <div className="w-14 h-14 rounded-xl shadow-lg flex items-center justify-center overflow-hidden" style={{ background: 'white', border: '3px solid white' }}>
                                            {market.logo_url ? <img src={market.logo_url} alt="" className="w-full h-full object-cover" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: market.is_active ? 'var(--saffron)' : '#9ca3af' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 pt-8">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h4 className="text-lg font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>{market.name}</h4>
                                        {market.is_premium && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'linear-gradient(135deg, var(--saffron), #d4a12a)', color: 'white', fontFamily: 'var(--font-outfit)' }}>Premium</span>}
                                        {!market.is_active && <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--terracotta)', color: 'white', fontFamily: 'var(--font-outfit)' }}>Deaktiviert</span>}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{market.zip_code && <strong className="font-semibold">{market.zip_code}</strong>} {market.city}</span>
                                    </div>
                                    <div className="flex gap-2 pt-3 border-t relative" style={{ borderColor: 'var(--sand)' }}>
                                        {/* Active/Inactive Toggle */}
                                        <div className="relative flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleActive(market.id, market.is_active)}
                                                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer"
                                                style={{ background: market.is_active ? 'var(--cardamom)' : 'var(--warm-gray)' }}
                                                title={market.is_active ? 'Markt ist aktiv' : 'Markt ist inaktiv'}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${market.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                            {/* Activation/Deactivation Confirmation Modal */}
                                            {toggleActiveConfirm?.id === market.id && (
                                                <div className="absolute bottom-full left-0 mb-2 glass-card p-3 shadow-lg z-10" style={{ minWidth: '200px' }}>
                                                    <p className="text-xs mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                                        {toggleActiveConfirm.currentStatus ? 'Markt wirklich deaktivieren?' : 'Markt wirklich aktivieren?'}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setToggleActiveConfirm(null)} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-70 cursor-pointer" style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Abbrechen</button>
                                                        <button onClick={performToggleActive} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 cursor-pointer" style={{ background: toggleActiveConfirm.currentStatus ? 'var(--terracotta)' : 'var(--cardamom)', color: 'white', fontFamily: 'var(--font-outfit)' }}>
                                                            {toggleActiveConfirm.currentStatus ? 'Deaktivieren' : 'Aktivieren'}
                                                        </button>
                                                    </div>
                                                    <div className="absolute -bottom-1.5 left-4 w-3 h-3 rotate-45" style={{ background: 'white' }} />
                                                </div>
                                            )}
                                        </div>
                                        <a href={`/shop/${market.slug}`} target="_blank" rel="noopener noreferrer" className="py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[rgba(107,142,122,0.2)]" style={{ background: 'rgba(107, 142, 122, 0.1)', color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            Ansehen
                                        </a>
                                        <button onClick={() => handleEditMarket(market)} className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer hover:bg-[#e8e4dc]" style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Bearbeiten
                                        </button>
                                        <div className="relative">
                                            <button onClick={() => setDeleteConfirm(deleteConfirm === market.id ? null : market.id)} className="py-2 px-3 rounded-xl text-sm font-semibold transition-all cursor-pointer hover:bg-[rgba(216,99,78,0.2)]" style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                            {deleteConfirm === market.id && (
                                                <div className="absolute bottom-full right-0 mb-2 glass-card p-3 shadow-lg z-10" style={{ minWidth: '180px' }}>
                                                    <p className="text-xs mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Wirklich löschen?</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-70 cursor-pointer" style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Nein</button>
                                                        <button onClick={() => handleDeleteMarket(market.id)} className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 cursor-pointer" style={{ background: 'var(--terracotta)', color: 'white', fontFamily: 'var(--font-outfit)' }}>Ja, löschen</button>
                                                    </div>
                                                    <div className="absolute -bottom-1.5 right-4 w-3 h-3 rotate-45" style={{ background: 'white' }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                Seite {currentPage} von {totalPages}<span className="mx-2">•</span>Zeige {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} von {totalCount}
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={goToPreviousPage} disabled={currentPage === 1} className="px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" style={{ background: currentPage === 1 ? 'var(--sand)' : 'white', color: 'var(--charcoal)', border: '2px solid var(--sand)', fontFamily: 'var(--font-outfit)' }}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Zurück
                                </button>
                                <div className="hidden sm:flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;
                                        return (
                                            <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className="w-10 h-10 rounded-xl font-semibold transition-all cursor-pointer" style={{ background: currentPage === pageNum ? 'var(--gradient-warm)' : 'transparent', color: currentPage === pageNum ? 'white' : 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>{pageNum}</button>
                                        );
                                    })}
                                </div>
                                <button onClick={goToNextPage} disabled={currentPage === totalPages} className="px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" style={{ background: currentPage === totalPages ? 'var(--sand)' : 'var(--gradient-warm)', color: currentPage === totalPages ? 'var(--charcoal)' : 'white', fontFamily: 'var(--font-outfit)' }}>
                                    Weiter
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
