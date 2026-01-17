'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
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
                .order('created_at', { ascending: false });

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

    const handleCancelEdit = () => {
        setEditingId(null);
        setShowImageGallery(false);
        setEditForm({
            product_name: '', description: '', price: '', unit: '',
            image_id: null, market_id: '', expires_at: '', ai_category: '', status: ''
        });
    };

    const handleSaveEdit = async () => {
        setSavingEdit(true);
        try {
            const { error } = await supabase
                .from('offers')
                .update({
                    product_name: editForm.product_name,
                    description: editForm.description,
                    price: parseFloat(editForm.price),
                    unit: editForm.unit,
                    image_id: editForm.image_id,
                    market_id: editForm.market_id,
                    ai_category: editForm.ai_category,
                    status: editForm.status,
                    expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : undefined
                })
                .eq('id', editingId);

            if (error) {
                showToast('Fehler beim Speichern: ' + error.message, 'error');
            } else {
                showToast('Angebot erfolgreich aktualisiert!', 'success');
                fetchOffers(); // Refresh list
                handleCancelEdit();
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
            const { error } = await supabase.from('offers').delete().eq('id', deleteConfirmId);
            if (error) {
                showToast('Fehler beim Löschen: ' + error.message, 'error');
            } else {
                showToast('Angebot erfolgreich gelöscht!', 'success');
                setOffers(prev => prev.filter(o => o.id !== deleteConfirmId));
                setDeleteConfirmId(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // -------------------------------------------------------------------------
    // IMAGE UPLOAD LOGIC
    // -------------------------------------------------------------------------
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const filename = `upload-${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('offer-images')
                .upload(filename, file, { contentType: file.type, upsert: false });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('offer-images').getPublicUrl(filename);

            const { data: newLibraryEntry, error: libraryError } = await supabase
                .from('image_library')
                .insert({
                    url: urlData.publicUrl,
                    product_name: editForm.product_name || 'Uploaded'
                })
                .select('id, url, product_name')
                .single();

            if (libraryError) throw libraryError;

            if (newLibraryEntry) {
                setLibraryImages(prev => [newLibraryEntry, ...prev]);
                setEditForm({ ...editForm, image_id: newLibraryEntry.id });
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
            <div className="space-y-6">
                <div className="flex flex-col xl:flex-row gap-6 items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                            Angebote Verwaltung
                        </h2>
                        <p className="text-[var(--warm-gray)] mt-1">
                            Verwalten und überwachen Sie alle Angebote an einem Ort.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                        {/* Market Search Bar */}
                        <div className="flex-1 md:w-80 relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Suche nach Markt..."
                                value={marketSearchQuery}
                                onChange={(e) => setMarketSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-[var(--saffron)] transition-all cursor-text"
                                style={{ fontFamily: 'var(--font-outfit)' }}
                            />
                        </div>

                        {/* Product Search Bar */}
                        <div className="flex-1 md:w-80 relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Suche nach Produkt..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-[var(--saffron)] transition-all cursor-text"
                                style={{ fontFamily: 'var(--font-outfit)' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-4">
                    {/* Market Filter */}
                    <div className="relative min-w-[200px] flex-1">
                        <select
                            value={selectedMarketId}
                            onChange={(e) => setSelectedMarketId(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border-none bg-white shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--saffron)] transition-all"
                            style={{ fontFamily: 'var(--font-outfit)' }}
                        >
                            <option value="">Alle Märkte</option>
                            {initialMarkets.map(m => (
                                <option key={m.id} value={m.id}>{m.zip_code} {m.city} - {m.name}</option>
                            ))}
                        </select>
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {/* Category Filter */}
                    <div className="relative min-w-[200px] flex-1">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border-none bg-white shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--saffron)] transition-all"
                            style={{ fontFamily: 'var(--font-outfit)' }}
                        >
                            <option value="">Alle Kategorien</option>
                            <option value="Obst & Gemüse">Obst & Gemüse</option>
                            <option value="Fleisch & Wurst">Fleisch & Wurst</option>
                            <option value="Milchprodukte">Milchprodukte</option>
                            <option value="Backwaren">Backwaren</option>
                            <option value="Getränke">Getränke</option>
                            <option value="Sonstiges">Sonstiges</option>
                        </select>
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {/* Status Filter */}
                    <div className="relative min-w-[180px] flex-1">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border-none bg-white shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--saffron)] transition-all"
                            style={{ fontFamily: 'var(--font-outfit)' }}
                        >
                            <option value="">Alle Status</option>
                            <option value="live">Veröffentlicht</option>
                            <option value="draft">Entwurf</option>
                        </select>
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>

            {/* ----------------- TABLE VIEW ----------------- */}
            <div className="bg-white rounded-3xl shadow-sm border border-[var(--sand)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b bg-[var(--sand)]/10" style={{ borderColor: 'var(--sand)' }}>
                                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]">Bild</th>
                                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]">Produkt</th>
                                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]">Markt</th>
                                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]">Preis</th>
                                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)]">Status</th>
                                <th className="p-5 font-bold text-xs uppercase tracking-wider text-[var(--warm-gray)] text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex justify-center items-center gap-3 text-[var(--warm-gray)]">
                                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                            <span>Lade Angebote...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOffers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-[var(--warm-gray)] flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full bg-[var(--sand)]/30 flex items-center justify-center mb-4 text-[var(--warm-gray)]">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                        </div>
                                        <p className="text-lg font-semibold text-[var(--charcoal)]">Keine Angebote gefunden</p>
                                        <p className="text-sm mt-1">Versuchen Sie es mit anderen Filtereinstellungen.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOffers.map(offer => {
                                    const isExpired = new Date(offer.expires_at) < new Date();
                                    const statusLabel = isExpired ? 'Abgelaufen' : (offer.status === 'live' ? 'Live' : 'Entwurf');
                                    const statusStyles = isExpired
                                        ? 'bg-red-50 text-red-700 border-red-100'
                                        : (offer.status === 'live'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-200');

                                    return (
                                        <tr
                                            key={offer.id}
                                            className="group hover:bg-[var(--sand)]/10 transition-colors cursor-pointer border-b last:border-none"
                                            style={{ borderColor: 'rgba(230, 168, 69, 0.4)' }}
                                            onClick={(e) => {
                                                // Prevent edit modal if clicked on action buttons
                                                if ((e.target as HTMLElement).closest('button')) return;
                                                handleEditClick(offer);
                                            }}
                                        >
                                            <td className="p-5">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm border border-[var(--sand)] group-hover:scale-105 transition-transform duration-300">
                                                    <img
                                                        src={offer.image_library?.url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=100'}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="font-bold text-lg text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                    {offer.product_name}
                                                </div>
                                                <div className="text-xs font-medium text-[var(--warm-gray)] mt-1 px-2 py-0.5 rounded-md bg-[var(--sand)]/20 inline-block">
                                                    {offer.ai_category || 'Keine Kategorie'}
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="text-sm font-bold text-[var(--charcoal)]">{offer.markets?.name}</div>
                                                <div className="text-xs text-[var(--warm-gray)]">{offer.markets?.city}</div>
                                            </td>
                                            <td className="p-5">
                                                <div className="font-mono font-bold text-[var(--terracotta)] text-lg">
                                                    {typeof offer.price === 'number' ? offer.price.toFixed(2) : offer.price} €
                                                </div>
                                                <div className="text-xs text-[var(--warm-gray)]">pro {offer.unit}</div>
                                            </td>
                                            <td className="p-5">
                                                <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${statusStyles}`}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(offer); }}
                                                        className="p-2.5 rounded-xl bg-white border border-[var(--sand)] text-[var(--charcoal)] shadow-sm hover:shadow-md hover:border-[var(--saffron)] hover:text-[var(--saffron)] hover:scale-105 transition-all cursor-pointer"
                                                        title="Bearbeiten"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(offer.id); }}
                                                        className="p-2.5 rounded-xl bg-white border border-[var(--sand)] text-[var(--warm-gray)] shadow-sm hover:shadow-md hover:border-red-200 hover:text-red-500 hover:bg-red-50 hover:scale-105 transition-all cursor-pointer"
                                                        title="Löschen"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ----------------- EDIT MODAL ----------------- */}
            {editingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(44, 40, 35, 0.4)' }}>
                    <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in" style={{ background: '#FAF7F2' }}>

                        {/* Header */}
                        <div className="px-8 py-6 border-b flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-10" style={{ borderColor: 'var(--sand)' }}>
                            <div>
                                <h3 className="text-2xl font-bold text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-playfair)' }}>
                                    Angebot bearbeiten
                                </h3>
                                <p className="text-sm text-[var(--warm-gray)] mt-1">
                                    Bearbeiten Sie die Details und das Erscheinungsbild des Angebots.
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
                                                    {initialMarkets.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name} ({m.city})</option>
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
                                className="px-8 py-3 rounded-xl font-bold transition-all hover:bg-gray-100 text-[var(--warm-gray)] cursor-pointer"
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
