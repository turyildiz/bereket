'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createOffer, updateOffer, deleteOffer } from '@/app/actions/offers';
import { getSignedUploadUrl } from '@/app/actions/storage';
import { addToImageLibrary } from '@/app/actions/library';
import { Market } from './types';

interface FullOffer {
    id: string;
    product_name: string;
    description: string | null;
    price: string | number;
    unit: string | null;
    image_id: string | null;
    market_id: string;
    ai_category: string | null;
    status: 'draft' | 'live' | 'expired';
    expires_at: string;
    created_at: string;
    markets: {
        id: string;
        name: string;
        slug: string;
        city: string;
        zip_code: string | null;
    } | null;
    image_library: {
        url: string;
    } | null;
}

interface OfferManagementProps {
    initialMarkets: Market[];
    showToast: (message: string, type: 'success' | 'error') => void;
}

export default function OfferManagement({ initialMarkets, showToast }: OfferManagementProps) {
    // -------------------------------------------------------------------------
    // STATE: Data & Filtering
    // -------------------------------------------------------------------------
    const [offers, setOffers] = useState<FullOffer[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [marketSearchQuery, setMarketSearchQuery] = useState('');
    const [selectedMarketId, setSelectedMarketId] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // -------------------------------------------------------------------------
    // STATE: Editing / Modals
    // -------------------------------------------------------------------------
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showImageGallery, setShowImageGallery] = useState(false);
    const [libraryImages, setLibraryImages] = useState<Array<{ id: string; url: string; product_name: string }>>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());

    const [editForm, setEditForm] = useState<{
        product_name: string;
        description: string;
        price: string;
        unit: string;
        image_id: string | null;
        market_id: string;
        expires_at: string;
        ai_category: string;
        status: string; // Additional field for management
    }>({
        product_name: '', description: '', price: '', unit: '',
        image_id: null, market_id: '', expires_at: '', ai_category: '', status: 'draft'
    });

    const supabase = createClient();
    const hasFetchedRef = useRef(false);

    // -------------------------------------------------------------------------
    // DATA FETCHING
    // -------------------------------------------------------------------------
    const fetchOffers = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('offers')
                .select(`
                    id, 
                    product_name, 
                    description, 
                    price, 
                    unit, 
                    image_id, 
                    market_id,
                    ai_category,
                    status,
                    expires_at, 
                    created_at, 
                    markets!inner(id, name, slug, city, zip_code), 
                    image_library(url)
                `)
                .order('created_at', { ascending: false })
                // Only show live offers in Offer Management (drafts are in Offer Review)
                .eq('status', 'live');

            // Apply Filters
            if (selectedMarketId) {
                query = query.eq('market_id', selectedMarketId);
            }
            if (selectedCategory) {
                query = query.eq('ai_category', selectedCategory);
            }
            if (selectedStatus) {
                query = query.eq('status', selectedStatus);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching offers:', error);
                showToast('Fehler beim Laden der Angebote: ' + error.message, 'error');
            } else {
                setOffers((data as unknown as FullOffer[]) || []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }, [supabase, selectedMarketId, selectedCategory, selectedStatus, showToast]);

    useEffect(() => {
        fetchOffers();
    }, [fetchOffers]);

    // -------------------------------------------------------------------------
    // FILTER LOGIC (Client-side Search)
    // -------------------------------------------------------------------------
    const filteredOffers = offers.filter(offer => {
        const matchProduct = !searchQuery || offer.product_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchMarketName = !marketSearchQuery || (offer.markets?.name || '').toLowerCase().includes(marketSearchQuery.toLowerCase());
        return matchProduct && matchMarketName;
    });

    // -------------------------------------------------------------------------
    // MARKET GROUPING LOGIC
    // -------------------------------------------------------------------------
    const toggleMarket = (marketId: string) => {
        setExpandedMarkets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(marketId)) {
                newSet.delete(marketId);
            } else {
                newSet.add(marketId);
            }
            return newSet;
        });
    };

    // Group offers by market
    const offersByMarket = filteredOffers.reduce((acc, offer) => {
        const marketId = offer.market_id;
        if (!acc[marketId]) {
            acc[marketId] = [];
        }
        acc[marketId].push(offer);
        return acc;
    }, {} as Record<string, FullOffer[]>);

    // Get default expiry date (7 days from now)
    const getDefaultExpiryDate = () => {
        const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    };

    // -------------------------------------------------------------------------
    // EDIT LOGIC
    // -------------------------------------------------------------------------
    const fetchLibraryImages = async () => {
        try {
            const { data, error } = await supabase
                .from('image_library')
                .select('id, url, product_name')
                .order('created_at', { ascending: false });
            if (!error) setLibraryImages(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEditClick = (offer: FullOffer) => {
        setEditingId(offer.id);
        setIsCreatingNew(false);
        setEditForm({
            product_name: offer.product_name,
            description: offer.description || '',
            price: offer.price.toString(),
            unit: offer.unit || '',
            image_id: offer.image_id,
            market_id: offer.market_id,
            expires_at: offer.expires_at ? offer.expires_at.split('T')[0] : '',
            ai_category: offer.ai_category || '',
            status: offer.status
        });
        fetchLibraryImages();
    };

    const handleCreateNewClick = () => {
        setIsCreatingNew(true);
        setEditingId('new-offer');
        setEditForm({
            product_name: '',
            description: '',
            price: '',
            unit: '',
            image_id: null,
            market_id: '',
            expires_at: getDefaultExpiryDate(),
            ai_category: '',
            status: 'draft'
        });
        fetchLibraryImages();
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setIsCreatingNew(false);
        setShowImageGallery(false);
        setEditForm({
            product_name: '', description: '', price: '', unit: '',
            image_id: null, market_id: '', expires_at: '', ai_category: '', status: ''
        });
    };

    const handleSaveEdit = async () => {
        // Validation for new offers
        if (isCreatingNew) {
            if (!editForm.market_id || !editForm.product_name.trim() || !editForm.price.trim() ||
                !editForm.unit.trim() || !editForm.ai_category) {
                showToast('Bitte fülle alle Pflichtfelder aus', 'error');
                return;
            }
        }

        setSavingEdit(true);
        try {
            if (isCreatingNew) {
                // Create new offer using secure server action
                const result = await createOffer({
                    product_name: editForm.product_name,
                    description: editForm.description || null,
                    price: editForm.price, // Server action accepts string
                    unit: editForm.unit,
                    image_id: editForm.image_id,
                    market_id: editForm.market_id,
                    ai_category: editForm.ai_category,
                    status: editForm.status as 'draft' | 'live' | 'expired',
                    expires_at: editForm.expires_at
                });

                if (!result.success) {
                    showToast(result.error || 'Fehler beim Erstellen', 'error');
                } else {
                    showToast('Angebot erfolgreich erstellt!', 'success');
                    fetchOffers();
                    handleCancelEdit();
                }
            } else {
                // Update existing offer using secure server action
                const result = await updateOffer(editingId!, {
                    product_name: editForm.product_name,
                    description: editForm.description || null,
                    price: editForm.price, // Server action accepts string
                    unit: editForm.unit,
                    image_id: editForm.image_id,
                    market_id: editForm.market_id,
                    ai_category: editForm.ai_category,
                    status: editForm.status as 'draft' | 'live' | 'expired',
                    expires_at: editForm.expires_at
                });

                if (!result.success) {
                    showToast(result.error || 'Fehler beim Speichern', 'error');
                } else {
                    showToast('Angebot erfolgreich aktualisiert!', 'success');
                    fetchOffers(); // Refresh list
                    handleCancelEdit();
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    // -------------------------------------------------------------------------
    // DELETE LOGIC
    // -------------------------------------------------------------------------
    const handleDeleteClick = (id: string) => {
        setDeleteConfirmId(id);
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            // Use secure server action instead of direct Supabase delete
            const result = await deleteOffer(deleteConfirmId);

            if (!result.success) {
                showToast(result.error || 'Fehler beim Löschen', 'error');
            } else {
                showToast('Angebot erfolgreich gelöscht!', 'success');
                setOffers(prev => prev.filter(o => o.id !== deleteConfirmId));
                setDeleteConfirmId(null);
            }
        } catch (err) {
            console.error(err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        }
    };

    // -------------------------------------------------------------------------
    // IMAGE UPLOAD LOGIC
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // IMAGE UPLOAD LOGIC
    // -------------------------------------------------------------------------
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            // 1. Get signed upload URL from server action
            const uploadResult = await getSignedUploadUrl(file.name, file.type, 'offer-images');

            if (!uploadResult.success || !uploadResult.signedUrl || !uploadResult.publicUrl) {
                showToast('Fehler beim Initialisieren des Uploads: ' + (uploadResult.error || 'Keine URL erhalten'), 'error');
                setUploadingImage(false);
                return;
            }

            // 2. Upload file directly to signed URL
            const uploadResponse = await fetch(uploadResult.signedUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadResponse.ok) {
                console.error('Upload response status:', uploadResponse.status);
                showToast('Fehler beim Hochladen der Datei.', 'error');
                setUploadingImage(false);
                return;
            }

            // 3. Register in Image Library using secure server action
            const result = await addToImageLibrary(
                uploadResult.publicUrl,
                editForm.product_name || 'Uploaded'
            );

            if (!result.success) {
                showToast(result.error || 'Fehler beim Speichern in Bibliothek', 'error');
                return;
            }

            if (result.imageData) {
                setLibraryImages(prev => [result.imageData!, ...prev]);
                setEditForm({ ...editForm, image_id: result.imageData!.id });
                showToast('Bild erfolgreich hochgeladen!', 'success');
                setShowImageGallery(false);
            }

        } catch (err: any) {
            console.error(err);
            showToast('Fehler beim Hochladen: ' + (err.message || err), 'error');
        } finally {
            setUploadingImage(false);
        }
    };


    return (
        <div className="space-y-6">
            {/* ----------------- HEADER & FILTERS ----------------- */}
            <div className="space-y-5">
                {/* Title & Action Bar */}
                <div className="bg-white rounded-2xl shadow-lg border-2 border-[var(--sand)] p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                Angebote Verwaltung
                            </h1>
                            <p className="text-base" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                Verwalten und überwachen Sie alle Angebote an einem Ort
                            </p>
                        </div>
                        <button
                            onClick={handleCreateNewClick}
                            disabled={isCreatingNew}
                            className="px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-105 hover:shadow-xl cursor-pointer flex items-center gap-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            style={{ background: 'linear-gradient(135deg, var(--terracotta) 0%, rgba(225, 139, 85, 0.85) 100%)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Neues Angebot
                        </button>
                    </div>
                </div>

                {/* Market Search Only */}
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--warm-gray)] group-focus-within:text-[var(--saffron)] transition-colors">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Suche nach Markt..."
                        value={marketSearchQuery}
                        onChange={(e) => setMarketSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-[var(--sand)] bg-white hover:border-[var(--saffron)]/30 focus:border-[var(--saffron)] focus:ring-4 focus:ring-[var(--saffron)]/10 transition-all cursor-text shadow-sm"
                        style={{ fontFamily: 'var(--font-outfit)' }}
                    />
                </div>
            </div>

            {/* ----------------- COLLAPSIBLE MARKET GROUPS ----------------- */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-[var(--sand)] p-12 flex justify-center items-center">
                        <div className="flex items-center gap-3 text-[var(--warm-gray)]">
                            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            <span>Lade Angebote...</span>
                        </div>
                    </div>
                ) : Object.keys(offersByMarket).length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-[var(--sand)] p-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-[var(--sand)]/30 flex items-center justify-center mx-auto mb-6 text-[var(--warm-gray)]">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        </div>
                        <p className="text-xl font-semibold text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>Keine Angebote gefunden</p>
                        <p className="text-sm text-[var(--warm-gray)]">Versuchen Sie es mit anderen Filtereinstellungen.</p>
                    </div>
                ) : (
                    Object.entries(offersByMarket).map(([marketId, marketOffers]) => {
                        const market = marketOffers[0]?.markets;
                        if (!market) return null;

                        const isExpanded = expandedMarkets.has(marketId);
                        const offerCount = marketOffers.length;

                        return (
                            <div key={marketId} className="bg-white rounded-2xl shadow-md border-2 overflow-hidden transition-all hover:shadow-xl" style={{ borderColor: isExpanded ? 'var(--saffron)' : 'var(--sand)' }}>
                                {/* Market Header - Clickable */}
                                <button
                                    onClick={() => toggleMarket(marketId)}
                                    className="w-full px-8 py-6 flex items-center justify-between transition-all cursor-pointer group"
                                    style={{
                                        background: isExpanded
                                            ? 'linear-gradient(135deg, rgba(230, 168, 69, 0.08) 0%, rgba(230, 168, 69, 0.02) 100%)'
                                            : 'transparent'
                                    }}
                                >
                                    <div className="flex items-center gap-5">
                                        {/* Arrow Icon */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-[var(--saffron)] shadow-lg' : 'bg-[var(--sand)]/40 group-hover:bg-[var(--sand)]'}`}>
                                            <svg
                                                className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-white' : 'text-[var(--charcoal)]'}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>

                                        {/* Market Info */}
                                        <div className="text-left">
                                            <div className="flex items-center gap-3 mb-1">
                                                {market.zip_code && (
                                                    <span className="font-mono text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: 'var(--saffron)', color: 'white' }}>
                                                        {market.zip_code}
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-2xl text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                    {market.name}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-[var(--warm-gray)] flex items-center gap-2" style={{ fontFamily: 'var(--font-outfit)' }}>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {market.city}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Offer Count Badge */}
                                    <div className="flex items-center gap-4">
                                        <div className="px-5 py-2.5 rounded-xl font-bold text-base shadow-sm" style={{ background: 'linear-gradient(135deg, var(--saffron) 0%, rgba(230, 168, 69, 0.8) 100%)', color: 'white', fontFamily: 'var(--font-outfit)' }}>
                                            {offerCount} {offerCount === 1 ? 'Angebot' : 'Angebote'}
                                        </div>
                                    </div>
                                </button>

                                {/* Offers Table - Collapsible */}
                                {isExpanded && (
                                    <div className="border-t-2" style={{ borderColor: 'var(--sand)' }}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr style={{ background: 'linear-gradient(to bottom, rgba(248, 245, 240, 0.6), rgba(248, 245, 240, 0.3))' }}>
                                                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]" style={{ fontFamily: 'var(--font-outfit)' }}>Bild</th>
                                                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]" style={{ fontFamily: 'var(--font-outfit)' }}>Produkt</th>
                                                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]" style={{ fontFamily: 'var(--font-outfit)' }}>Preis</th>
                                                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]" style={{ fontFamily: 'var(--font-outfit)' }}>Status</th>
                                                        <th className="p-4 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)] text-right" style={{ fontFamily: 'var(--font-outfit)' }}>Aktionen</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {marketOffers.map(offer => {
                                                        const isExpired = new Date(offer.expires_at) < new Date();
                                                        const statusLabel = isExpired ? 'Abgelaufen' : (offer.status === 'live' ? 'Live' : 'Entwurf');
                                                        const statusStyles = isExpired
                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                            : (offer.status === 'live'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200');

                                                        return (
                                                            <tr
                                                                key={offer.id}
                                                                className="group hover:bg-gradient-to-r hover:from-[var(--sand)]/20 hover:to-transparent transition-all cursor-pointer border-b border-[var(--sand)]/30 last:border-none"
                                                                onClick={(e) => {
                                                                    if ((e.target as HTMLElement).closest('button')) return;
                                                                    handleEditClick(offer);
                                                                }}
                                                            >
                                                                <td className="p-4">
                                                                    <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-[var(--sand)] group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                                                                        <img
                                                                            src={offer.image_library?.url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=100'}
                                                                            alt=""
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-bold text-lg text-[var(--charcoal)] mb-1" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                                        {offer.product_name}
                                                                    </div>
                                                                    <div className="text-xs font-semibold text-[var(--warm-gray)] px-3 py-1 rounded-full bg-[var(--sand)]/30 inline-block" style={{ fontFamily: 'var(--font-outfit)' }}>
                                                                        {offer.ai_category || 'Keine Kategorie'}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-mono font-bold text-xl" style={{ color: 'var(--terracotta)' }}>
                                                                        {typeof offer.price === 'number' ? offer.price.toFixed(2) : parseFloat(offer.price).toFixed(2)} €
                                                                    </div>
                                                                    <div className="text-xs text-[var(--warm-gray)] font-medium" style={{ fontFamily: 'var(--font-outfit)' }}>pro {offer.unit || 'Stück'}</div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`px-4 py-2 rounded-full text-xs font-bold border-2 inline-block ${statusStyles}`} style={{ fontFamily: 'var(--font-outfit)' }}>
                                                                        {statusLabel}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleEditClick(offer); }}
                                                                            className="p-3 rounded-xl bg-white border-2 border-[var(--sand)] text-[var(--charcoal)] shadow-sm hover:shadow-lg hover:border-[var(--saffron)] hover:bg-[var(--saffron)] hover:text-white hover:scale-110 transition-all cursor-pointer"
                                                                            title="Bearbeiten"
                                                                        >
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(offer.id); }}
                                                                            className="p-3 rounded-xl bg-white border-2 border-[var(--sand)] text-[var(--warm-gray)] shadow-sm hover:shadow-lg hover:border-red-400 hover:text-red-500 hover:bg-red-50 hover:scale-110 transition-all cursor-pointer"
                                                                            title="Löschen"
                                                                        >
                                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* ----------------- EDIT MODAL ----------------- */}
            {editingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(44, 40, 35, 0.4)' }}>
                    <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in" style={{ background: '#FAF7F2' }}>

                        {/* Header */}
                        <div className="px-8 py-6 border-b flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10" style={{ borderColor: 'var(--sand)' }}>
                            <div>
                                <h3 className="text-2xl font-bold text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                                    {isCreatingNew ? 'Angebot erstellen' : 'Angebot bearbeiten'}
                                </h3>
                                <p className="text-sm text-[var(--warm-gray)] mt-1">
                                    {isCreatingNew ? 'Erstellen Sie ein neues Angebot für Ihren Markt.' : 'Bearbeiten Sie die Details und das Erscheinungsbild des Angebots.'}
                                </p>
                            </div>
                            <button
                                onClick={handleCancelEdit}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors text-[var(--charcoal)]"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* content container */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                                {/* LEFT COLUMN: Image & Preview */}
                                <div className="lg:col-span-5 space-y-6">
                                    <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Vorschau & Bild</label>

                                    {/* Image Preview Card */}
                                    <div className="relative group rounded-3xl overflow-hidden shadow-lg aspect-[4/3] bg-white border border-[var(--sand)]">
                                        {editForm.image_id || !isCreatingNew ? (
                                            <img
                                                src={(() => {
                                                    if (editForm.image_id) {
                                                        const libImg = libraryImages.find(i => i.id === editForm.image_id);
                                                        if (libImg) return libImg.url;
                                                    }
                                                    return 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600';
                                                })()}
                                                alt="Preview"
                                                className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                                <div className="w-24 h-24 rounded-2xl bg-white/80 flex items-center justify-center shadow-lg">
                                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <p className="mt-4 text-sm font-semibold text-gray-500" style={{ fontFamily: 'var(--font-outfit)' }}>Kein Bild ausgewählt</p>
                                            </div>
                                        )}

                                        {/* Overlay with Change Button */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                                            <button
                                                onClick={() => setShowImageGallery(true)}
                                                className="px-6 py-3 rounded-xl font-bold text-white shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2"
                                                style={{ background: 'var(--saffron)' }}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                Bild ändern
                                            </button>
                                        </div>

                                        {/* Status Badge Preview */}
                                        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm"
                                            style={{
                                                background: editForm.status === 'live' ? '#dcfce7' : '#fef3c7',
                                                color: editForm.status === 'live' ? '#166534' : '#92400e'
                                            }}>
                                            {editForm.status === 'live' ? 'Live' : 'Entwurf'}
                                        </div>
                                    </div>

                                    {/* Upload Tip */}
                                    <div className="p-4 rounded-xl bg-[var(--sand)]/20 border border-[var(--sand)] text-sm text-[var(--warm-gray)] flex gap-3">
                                        <svg className="w-5 h-5 flex-shrink-0 text-[var(--saffron)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p>Nutzen Sie hochauflösende Bilder für eine bessere Darstellung im Shop. Das Bild wird automatisch optimiert.</p>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Form Fields */}
                                <div className="lg:col-span-7 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Product Name */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Produktname</label>
                                            <input
                                                type="text"
                                                value={editForm.product_name}
                                                onChange={e => setEditForm({ ...editForm, product_name: e.target.value })}
                                                className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none font-bold text-lg"
                                                style={{ borderColor: 'var(--sand)', fontFamily: 'var(--font-playfair)' }}
                                                placeholder="z.B. Frische Bananen"
                                            />
                                        </div>

                                        {/* Market Selection */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Markt Zuordnung</label>
                                            <div className="relative">
                                                <select
                                                    value={editForm.market_id}
                                                    onChange={e => setEditForm({ ...editForm, market_id: e.target.value })}
                                                    className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none appearance-none cursor-pointer"
                                                    style={{ borderColor: 'var(--sand)', fontFamily: 'var(--font-outfit)' }}
                                                >
                                                    <option value="">Bitte Markt auswählen</option>
                                                    {initialMarkets.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name} ({m.zip_code} {m.city})</option>
                                                    ))}
                                                </select>
                                                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Preis (€)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={editForm.price}
                                                    onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                                    className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none font-mono font-medium"
                                                    style={{ borderColor: 'var(--sand)' }}
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">€</span>
                                            </div>
                                        </div>

                                        {/* Unit */}
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Einheit</label>
                                            <input
                                                type="text"
                                                value={editForm.unit}
                                                onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                                                className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none"
                                                style={{ borderColor: 'var(--sand)' }}
                                                placeholder="z.B. kg, Stück, Bund"
                                            />
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Kategorie</label>
                                            <div className="relative">
                                                <select
                                                    value={editForm.ai_category}
                                                    onChange={e => setEditForm({ ...editForm, ai_category: e.target.value })}
                                                    className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none appearance-none cursor-pointer"
                                                    style={{ borderColor: 'var(--sand)' }}
                                                >
                                                    <option value="">Bitte wählen...</option>
                                                    <option value="Obst & Gemüse">Obst & Gemüse</option>
                                                    <option value="Fleisch & Wurst">Fleisch & Wurst</option>
                                                    <option value="Milchprodukte">Milchprodukte</option>
                                                    <option value="Backwaren">Backwaren</option>
                                                    <option value="Getränke">Getränke</option>
                                                    <option value="Sonstiges">Sonstiges</option>
                                                </select>
                                                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Status</label>
                                            <div className="relative">
                                                <select
                                                    value={editForm.status}
                                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                                    className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none appearance-none cursor-pointer"
                                                    style={{ borderColor: 'var(--sand)' }}
                                                >
                                                    <option value="draft">Entwurf</option>
                                                    <option value="live">Veröffentlicht (Live)</option>
                                                    <option value="expired">Abgelaufen</option>
                                                </select>
                                                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>

                                        {/* Expiry Date */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Gültig bis</label>
                                            <input
                                                type="date"
                                                value={editForm.expires_at}
                                                onChange={e => setEditForm({ ...editForm, expires_at: e.target.value })}
                                                className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none"
                                                style={{ borderColor: 'var(--sand)' }}
                                            />
                                        </div>

                                        {/* Description */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-[var(--charcoal)] mb-2">Beschreibung</label>
                                            <textarea
                                                rows={3}
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                className="w-full px-5 py-3.5 rounded-xl border bg-white/60 focus:bg-white transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none resize-none"
                                                style={{ borderColor: 'var(--sand)' }}
                                                placeholder="Beschreibe das Produkt kurz..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-8 py-6 border-t bg-white sticky bottom-0 z-10 flex justify-end gap-4" style={{ borderColor: 'var(--sand)' }}>
                            <button
                                onClick={handleCancelEdit}
                                className="px-8 py-3 rounded-xl font-bold transition-all border-2 hover:bg-gray-50 hover:border-gray-300 cursor-pointer shadow-sm"
                                style={{ borderColor: 'var(--sand)', color: 'var(--charcoal)' }}
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="px-8 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                                style={{ background: 'var(--gradient-warm)' }}
                            >
                                {savingEdit ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        <span>Speichern...</span>
                                    </>
                                ) : (
                                    <span>Änderungen speichern</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------- DELETE MODAL ----------------- */}
            {/* ----------------- DELETE MODAL ----------------- */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all animate-in fade-in duration-200">
                    <div className="max-w-sm w-full p-8 rounded-[2rem] shadow-2xl space-y-6 text-center transform scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden" style={{ background: '#FAF7F2' }}>
                        {/* Decorative background element */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600"></div>

                        <div className="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-inner mb-2 border border-red-100">
                            <svg className="w-10 h-10 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-[var(--charcoal)] mb-2" style={{ fontFamily: 'var(--font-playfair)' }}>
                                Angebot löschen?
                            </h3>
                            <p className="text-[var(--warm-gray)] px-4 leading-relaxed">
                                Möchten Sie dieses Angebot wirklich unwiderruflich entfernen?
                            </p>
                        </div>

                        <div className="flex gap-4 justify-center pt-2">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-3 px-6 rounded-xl border border-[var(--sand)] text-[var(--charcoal)] font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold shadow-lg shadow-red-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                            >
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ----------------- IMAGE GALLERY MODAL (Reusable Logic) ----------------- */}
            {/* ----------------- IMAGE GALLERY MODAL (Reusable Logic) ----------------- */}
            {showImageGallery && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10" style={{ borderColor: 'var(--sand)' }}>
                            <div>
                                <h3 className="text-2xl font-bold text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-playfair)' }}>Bild auswählen</h3>
                                <p className="text-sm text-[var(--warm-gray)]">Wählen Sie ein Bild aus der Bibliothek oder laden Sie ein neues hoch.</p>
                            </div>
                            <button
                                onClick={() => setShowImageGallery(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors text-[var(--charcoal)] cursor-pointer"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Upload & Search Bar */}
                        <div className="p-6 border-b bg-[var(--sand)]/10 space-y-4" style={{ borderColor: 'var(--sand)' }}>
                            {/* Custom File Upload */}
                            <div className="flex items-center gap-4">
                                <label className="flex-shrink-0 px-6 py-3 rounded-xl bg-[var(--charcoal)] text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    <span>Neues Bild hochladen</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                                </label>
                                {uploadingImage && <span className="text-[var(--saffron)] font-medium animate-pulse">Wird hochgeladen...</span>}

                                <div className="flex-1 relative">
                                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Bildbibliothek durchsuchen..."
                                        value={imageSearchQuery}
                                        onChange={e => setImageSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border bg-white focus:ring-2 focus:ring-[var(--saffron)] outline-none transition-all"
                                        style={{ borderColor: 'var(--sand)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {libraryImages.filter(i => i.product_name.toLowerCase().includes(imageSearchQuery.toLowerCase())).map(img => (
                                    <button
                                        key={img.id}
                                        onClick={() => { setEditForm({ ...editForm, image_id: img.id }); setShowImageGallery(false); }}
                                        className="group aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-[var(--sand)] hover:border-[var(--saffron)] hover:shadow-md hover:scale-[1.02] transition-all relative cursor-pointer"
                                    >
                                        <img src={img.url} className="w-full h-full object-cover" alt={img.product_name} />
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                            <div className="text-white text-xs font-medium truncate">{img.product_name}</div>
                                        </div>
                                        {/* Selection Indicator Overlay */}
                                        <div className="absolute inset-0 bg-[var(--saffron)]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white rounded-full p-2 text-[var(--saffron)] shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
