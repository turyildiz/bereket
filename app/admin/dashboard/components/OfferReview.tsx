'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { publishOffer, createOffer, updateOffer, deleteOffer } from '@/app/actions/offers';
import { getSignedUploadUrl } from '@/app/actions/storage';
import { addToImageLibrary } from '@/app/actions/library';

interface DraftOffer {
    id: string;
    product_name: string;
    description: string | null;
    price: string;
    unit: string | null;
    image_id: string | null;
    expires_at: string;
    created_at: string;
    market_id: string;
    markets: {
        id: string;
        name: string;
        city: string;
    } | null;
    image_library: {
        url: string;
    } | null;
}

interface OfferReviewProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

export default function OfferReview({ showToast }: OfferReviewProps) {
    const [draftOffers, setDraftOffers] = useState<DraftOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showImageGallery, setShowImageGallery] = useState(false);
    const [libraryImages, setLibraryImages] = useState<Array<{ id: string; url: string; product_name: string }>>([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [savingEdit, setSavingEdit] = useState(false);
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [originalImageId, setOriginalImageId] = useState<string | null>(null);
    const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [markets, setMarkets] = useState<Array<{ id: string; name: string; city: string; zip_code: string | null }>>([]);
    const [marketSearchQuery, setMarketSearchQuery] = useState('');
    const [showMarketDropdown, setShowMarketDropdown] = useState(false);
    const [selectedMarketFilter, setSelectedMarketFilter] = useState<string>(''); // New filter state
    const [editForm, setEditForm] = useState<{
        product_name: string;
        description: string;
        price: string;
        unit: string;
        image_id: string | null;
        market_id: string;
        expires_at: string;
        ai_category: string;
    }>({ product_name: '', description: '', price: '', unit: '', image_id: null, market_id: '', expires_at: '', ai_category: '' });
    const [touchedFields, setTouchedFields] = useState<{ market_id?: boolean; product_name?: boolean; price?: boolean; unit?: boolean; image_id?: boolean; ai_category?: boolean }>({});
    const [generatingDescription, setGeneratingDescription] = useState(false);

    const supabase = createClient();
    const hasFetchedRef = useRef(false);

    const fetchDraftOffers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('offers')
                .select('id, product_name, description, price, unit, image_id, expires_at, created_at, market_id, markets!inner(id, name, city), image_library(url)')
                .eq('markets.is_active', true)
                .eq('status', 'draft')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching draft offers:', error);
                showToast('Fehler beim Laden der Angebote: ' + error.message, 'error');
            } else {
                setDraftOffers((data as unknown as DraftOffer[]) || []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    const fetchMarkets = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('markets')
                .select('id, name, city, zip_code')
                .eq('is_active', true)
                .order('zip_code', { ascending: true, nullsFirst: false });

            if (error) {
                console.error('Error fetching markets:', error);
            } else {
                setMarkets(data || []);
            }
        } catch (err) {
            console.error('Unexpected error fetching markets:', err);
        }
    }, [supabase]);

    // Initial fetch on mount only
    useEffect(() => {
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchDraftOffers();
            fetchMarkets();
        }
    }, [fetchDraftOffers, fetchMarkets]);

    const handlePublish = async (offerId: string) => {
        setPublishingId(offerId);
        setPublishConfirmId(null);

        try {
            // Use secure server action instead of direct Supabase update
            const result = await publishOffer(offerId);

            if (!result.success) {
                showToast(result.error || 'Fehler beim Veröffentlichen', 'error');
            } else {
                showToast('Angebot ist jetzt live!', 'success');
                setDraftOffers(prev => prev.filter(offer => offer.id !== offerId));
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setPublishingId(null);
        }
    };

    const handleEditClick = (offer: DraftOffer) => {
        setEditingId(offer.id);
        setOriginalImageId(offer.image_id); // Store original image_id
        setEditForm({
            product_name: offer.product_name,
            description: offer.description || '',
            price: offer.price,
            unit: offer.unit || '',
            image_id: offer.image_id,
            market_id: offer.market_id,
            expires_at: offer.expires_at ? offer.expires_at.split('T')[0] : '', // Format as YYYY-MM-DD for date input
            ai_category: (offer as any).ai_category || ''
        });
        // Fetch library images immediately so preview works
        fetchLibraryImages();
    };

    // Helper to get default expiry date (7 days from now) in YYYY-MM-DD format
    const getDefaultExpiryDate = () => {
        const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return date.toISOString().split('T')[0];
    };

    const handleCancelEdit = () => {
        // If we were creating a new offer, remove the placeholder from the list
        if (isCreatingNew) {
            setDraftOffers(prev => prev.filter(offer => offer.id !== 'new-offer'));
        }
        setEditingId(null);
        setShowImageGallery(false);
        setImageSearchQuery('');
        setOriginalImageId(null);
        setEditForm({ product_name: '', description: '', price: '', unit: '', image_id: null, market_id: '', expires_at: '', ai_category: '' });
        setIsCreatingNew(false);
        setMarketSearchQuery('');
        setShowMarketDropdown(false);
        setTouchedFields({});
    };

    const handleCreateNewClick = () => {
        setIsCreatingNew(true);
        setEditingId('new-offer');
        setEditForm({ product_name: '', description: '', price: '', unit: '', image_id: null, market_id: '', expires_at: getDefaultExpiryDate(), ai_category: '' });
        setTouchedFields({});
        // Add a temporary placeholder offer to the list
        const newOffer: DraftOffer = {
            id: 'new-offer',
            product_name: '',
            description: '',
            price: '',
            unit: '',
            image_id: null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
            created_at: new Date().toISOString(),
            market_id: '',
            markets: null,
            image_library: null
        };
        setDraftOffers([newOffer, ...draftOffers]);
    };

    // Validation helper for new offers
    const isFormValid = () => {
        if (!isCreatingNew) return true;
        return (
            editForm.market_id &&
            editForm.product_name.trim() &&
            editForm.price.trim() &&
            editForm.unit.trim() &&
            editForm.image_id &&
            editForm.ai_category
        );
    };

    const handleSaveEdit = async (offerId: string) => {
        // For new offers, mark all fields as touched to show validation
        if (isCreatingNew) {
            setTouchedFields({ market_id: true, product_name: true, price: true, unit: true, image_id: true, ai_category: true });
            if (!editForm.market_id || !editForm.product_name.trim() || !editForm.price.trim() || !editForm.unit.trim() || !editForm.image_id || !editForm.ai_category) {
                return; // Don't proceed if validation fails
            }
        }

        setSavingEdit(true);
        try {
            if (isCreatingNew) {
                // Generate AI description
                setGeneratingDescription(true);
                let generatedDescription = '';
                try {
                    const response = await fetch('/api/offers/generate-description', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            product_name: editForm.product_name,
                            price: editForm.price,
                            unit: editForm.unit
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        generatedDescription = data.description || '';
                    }
                } catch (aiError) {
                    console.error('Error generating description:', aiError);
                    // Continue without description if AI fails
                }
                setGeneratingDescription(false);

                // Create new offer using secure server action
                const result = await createOffer({
                    product_name: editForm.product_name,
                    description: generatedDescription || null,
                    price: editForm.price, // Server action accepts string
                    unit: editForm.unit,
                    image_id: editForm.image_id,
                    market_id: editForm.market_id,
                    ai_category: editForm.ai_category,
                    status: 'draft',
                    expires_at: editForm.expires_at
                });

                if (!result.success) {
                    showToast(result.error || 'Fehler beim Erstellen', 'error');
                } else {
                    showToast('Angebot erfolgreich erstellt!', 'success');
                    // Refresh the list to get the newly created offer with all relations
                    await fetchDraftOffers();
                    setEditingId(null);
                    setIsCreatingNew(false);
                }
            } else {
                // Update existing offer using secure server action
                const result = await updateOffer(offerId, {
                    product_name: editForm.product_name,
                    description: editForm.description || null,
                    price: editForm.price, // Server action accepts string
                    unit: editForm.unit,
                    image_id: editForm.image_id,
                    market_id: editForm.market_id,
                    ai_category: editForm.ai_category,
                    expires_at: editForm.expires_at
                });

                if (!result.success) {
                    showToast(result.error || 'Fehler beim Speichern', 'error');
                } else {
                    showToast('Angebot erfolgreich aktualisiert!', 'success');
                    // Fetch updated offer with image_library data
                    const { data: updatedOffer } = await supabase
                        .from('offers')
                        .select('id, product_name, description, price, unit, image_id, expires_at, created_at, market_id, markets(id, name, city), image_library(url)')
                        .eq('id', offerId)
                        .single();

                    if (updatedOffer) {
                        setDraftOffers(prev => prev.map(offer =>
                            offer.id === offerId
                                ? updatedOffer as unknown as DraftOffer
                                : offer
                        ));
                    }
                    setEditingId(null);
                }
            }
            setShowImageGallery(false);
            setImageSearchQuery('');
            setOriginalImageId(null);
            setMarketSearchQuery('');
            setShowMarketDropdown(false);
            setTouchedFields({});
        } catch (err) {
            console.error('Unexpected error:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const fetchLibraryImages = async () => {
        try {
            const { data, error } = await supabase
                .from('image_library')
                .select('id, url, product_name')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching library images:', error);
            } else {
                setLibraryImages(data || []);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        }
    };

    const handleChangeImageClick = () => {
        setShowImageGallery(true);
        fetchLibraryImages();
    };

    const handleSelectLibraryImage = (imageId: string) => {
        setEditForm({ ...editForm, image_id: imageId });
        setShowImageGallery(false);
    };

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
            const productNameForImage = editForm.product_name || 'Uploaded';
            const result = await addToImageLibrary(
                uploadResult.publicUrl,
                productNameForImage
            );

            if (!result.success) {
                showToast(result.error || 'Fehler beim Speichern in Bibliothek', 'error');
                return;
            }

            if (result.imageData) {
                // Add the new image to libraryImages so the preview can find it
                setLibraryImages(prev => [result.imageData!, ...prev]);
                setEditForm({ ...editForm, image_id: result.imageData!.id });
                showToast('Bild erfolgreich hochgeladen!', 'success');
                setShowImageGallery(false);
            }
        } catch (err: any) {
            console.error('Unexpected error:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDeleteClick = (offerId: string) => {
        setDeleteConfirmId(offerId);
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
                // Optimistic update
                setDraftOffers(prev => prev.filter(offer => offer.id !== deleteConfirmId));
                setDeleteConfirmId(null);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            showToast('Ein unerwarteter Fehler ist aufgetreten.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saffron)] border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-[var(--sand)] p-8 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                            Angebote Prüfen
                        </h1>
                        <p className="text-base" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                            {draftOffers.filter(offer => !selectedMarketFilter || offer.market_id === selectedMarketFilter).length} {draftOffers.filter(offer => !selectedMarketFilter || offer.market_id === selectedMarketFilter).length === 1 ? 'Angebot wartet' : 'Angebote warten'} auf Freigabe
                        </p>
                    </div>
                    <button
                        onClick={() => fetchDraftOffers()}
                        className="px-6 py-3.5 rounded-xl font-bold transition-all hover:scale-105 hover:shadow-xl cursor-pointer flex items-center gap-3 shadow-lg whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, var(--sand) 0%, rgba(217, 201, 166, 0.7) 100%)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Aktualisieren
                    </button>
                </div>
            </div>

            {/* Market Filter */}
            <div className="relative w-full sm:w-80">
                <select
                    value={selectedMarketFilter}
                    onChange={(e) => setSelectedMarketFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-none bg-white shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--saffron)] transition-all"
                    style={{ fontFamily: 'var(--font-outfit)' }}
                >
                    <option value="">Alle Märkte</option>
                    {markets.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.zip_code} {m.city} - {m.name}
                        </option>
                    ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Draft Offers List */}
            {draftOffers.filter(offer => !selectedMarketFilter || offer.market_id === selectedMarketFilter).length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(107, 142, 122, 0.1)' }}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--cardamom)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                        Keine Entwürfe vorhanden
                    </h3>
                    <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                        Alle Angebote wurden geprüft und freigegeben.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {draftOffers
                        .filter(offer => !selectedMarketFilter || offer.market_id === selectedMarketFilter)
                        .map((offer) => {
                            const market = offer.markets;
                            const expiresDate = new Date(offer.expires_at);
                            const createdDate = new Date(offer.created_at);
                            const isPublishing = publishingId === offer.id;
                            const isEditing = editingId === offer.id;

                            return (
                                <div
                                    key={offer.id}
                                    className="glass-card overflow-hidden relative"
                                    style={{ border: '2px solid rgba(230, 168, 69, 0.3)' }}
                                >
                                    {/* Edit/Delete Buttons */}
                                    {!isEditing && (
                                        <div className="absolute top-3 right-3 flex gap-2 z-10">
                                            <button
                                                onClick={() => handleEditClick(offer)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                                                style={{ background: 'rgba(255, 255, 255, 0.9)', color: 'var(--charcoal)' }}
                                                title="Bearbeiten"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(offer.id)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                                                style={{ background: 'rgba(225, 139, 85, 0.9)', color: 'white' }}
                                                title="Löschen"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Image */}
                                    <div className="relative aspect-[4/3] overflow-hidden" style={{ background: isCreatingNew && !editForm.image_id ? '#e5e7eb' : '#f8f5f0' }}>
                                        {isCreatingNew && !editForm.image_id ? (
                                            // Grey placeholder with icon for new offers
                                            <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-24 h-24" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" strokeWidth="1">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <img
                                                src={(() => {
                                                    // In edit mode, check if user selected a DIFFERENT image
                                                    if (isEditing && editForm.image_id && editForm.image_id !== originalImageId && libraryImages.length > 0) {
                                                        // User selected a new image - find it in library
                                                        const selectedImage = libraryImages.find(img => img.id === editForm.image_id);
                                                        if (selectedImage) {
                                                            return selectedImage.url;
                                                        }
                                                    }

                                                    // Fall back to the offer's current image
                                                    const currentImageUrl = offer.image_library?.url;
                                                    if (currentImageUrl) {
                                                        return currentImageUrl;
                                                    }

                                                    // Final fallback to placeholder for existing offers
                                                    return 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600';
                                                })()}
                                                alt={offer.product_name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600';
                                                }}
                                            />
                                        )}
                                        <div
                                            className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold"
                                            style={{ background: 'var(--saffron)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                                        >
                                            Entwurf
                                        </div>

                                        {/* Change Image Button (Edit Mode Only) */}
                                        {isEditing && (
                                            <button
                                                onClick={() => {
                                                    handleChangeImageClick();
                                                    setTouchedFields(prev => ({ ...prev, image_id: true }));
                                                }}
                                                className={`absolute bottom-4 right-4 px-4 py-2.5 rounded-xl font-bold transition-all hover:scale-105 cursor-pointer flex items-center gap-2 shadow-2xl ${isCreatingNew && touchedFields.image_id && !editForm.image_id ? 'ring-2 ring-[var(--terracotta)]' : ''}`}
                                                style={{ background: isCreatingNew && !editForm.image_id ? 'var(--terracotta)' : 'var(--saffron)', color: 'white', fontFamily: 'var(--font-outfit)', fontSize: '1rem' }}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {isCreatingNew && !editForm.image_id ? 'Bild auswählen *' : 'Bild ändern'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 space-y-3">
                                        {isEditing ? (
                                            <>
                                                {/* Edit Mode */}
                                                <div className="space-y-3">
                                                    {isCreatingNew && (
                                                        <div className="relative">
                                                            <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: touchedFields.market_id && !editForm.market_id ? 'var(--terracotta)' : 'var(--warm-gray)' }}>
                                                                Markt auswählen
                                                                <span style={{ color: 'var(--terracotta)' }}>*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={marketSearchQuery || (editForm.market_id ? (() => {
                                                                        const selected = markets.find(m => m.id === editForm.market_id);
                                                                        return selected ? `${selected.zip_code || '—'} · ${selected.name}, ${selected.city}` : '';
                                                                    })() : '')}
                                                                    onChange={(e) => {
                                                                        setMarketSearchQuery(e.target.value);
                                                                        setShowMarketDropdown(true);
                                                                        if (editForm.market_id) {
                                                                            setEditForm({ ...editForm, market_id: '' });
                                                                        }
                                                                    }}
                                                                    onFocus={() => setShowMarketDropdown(true)}
                                                                    onBlur={() => setTouchedFields(prev => ({ ...prev, market_id: true }))}
                                                                    placeholder="PLZ oder Name eingeben..."
                                                                    className={`w-full px-3 py-2 rounded-lg border bg-white pr-8 transition-colors ${touchedFields.market_id && !editForm.market_id ? 'border-[var(--terracotta)] ring-1 ring-[var(--terracotta)]' : ''}`}
                                                                    style={{ borderColor: touchedFields.market_id && !editForm.market_id ? 'var(--terracotta)' : 'var(--sand)', fontFamily: 'var(--font-outfit)' }}
                                                                />
                                                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                                </svg>
                                                            </div>
                                                            {showMarketDropdown && (
                                                                <div
                                                                    className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg shadow-lg border"
                                                                    style={{ background: 'white', borderColor: 'var(--sand)' }}
                                                                >
                                                                    {markets
                                                                        .filter(market => {
                                                                            const query = marketSearchQuery.toLowerCase();
                                                                            return !query ||
                                                                                market.name.toLowerCase().includes(query) ||
                                                                                market.city.toLowerCase().includes(query) ||
                                                                                (market.zip_code && market.zip_code.includes(query));
                                                                        })
                                                                        .map(market => (
                                                                            <button
                                                                                key={market.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditForm({ ...editForm, market_id: market.id });
                                                                                    setMarketSearchQuery('');
                                                                                    setShowMarketDropdown(false);
                                                                                }}
                                                                                className="w-full px-3 py-2 text-left hover:bg-[var(--sand)] transition-colors cursor-pointer flex items-center gap-2"
                                                                                style={{ fontFamily: 'var(--font-outfit)' }}
                                                                            >
                                                                                <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--cream)', color: 'var(--charcoal)' }}>
                                                                                    {market.zip_code || '—'}
                                                                                </span>
                                                                                <span className="truncate">{market.name}, {market.city}</span>
                                                                            </button>
                                                                        ))
                                                                    }
                                                                    {markets.filter(market => {
                                                                        const query = marketSearchQuery.toLowerCase();
                                                                        return !query ||
                                                                            market.name.toLowerCase().includes(query) ||
                                                                            market.city.toLowerCase().includes(query) ||
                                                                            (market.zip_code && market.zip_code.includes(query));
                                                                    }).length === 0 && (
                                                                            <div className="px-3 py-2 text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                                                Kein Markt gefunden
                                                                            </div>
                                                                        )}
                                                                </div>
                                                            )}
                                                            {touchedFields.market_id && !editForm.market_id && (
                                                                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}>
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Bitte wähle einen Markt aus
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: touchedFields.product_name && !editForm.product_name.trim() && isCreatingNew ? 'var(--terracotta)' : 'var(--warm-gray)' }}>
                                                            Produktname
                                                            {isCreatingNew && <span style={{ color: 'var(--terracotta)' }}>*</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editForm.product_name}
                                                            onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                                                            onBlur={() => setTouchedFields(prev => ({ ...prev, product_name: true }))}
                                                            className={`w-full px-3 py-2 rounded-lg border transition-colors ${touchedFields.product_name && !editForm.product_name.trim() && isCreatingNew ? 'border-[var(--terracotta)] ring-1 ring-[var(--terracotta)]' : ''}`}
                                                            style={{ borderColor: touchedFields.product_name && !editForm.product_name.trim() && isCreatingNew ? 'var(--terracotta)' : 'var(--sand)', fontFamily: 'var(--font-playfair)', fontSize: '1.125rem', fontWeight: 'bold' }}
                                                        />
                                                        {touchedFields.product_name && !editForm.product_name.trim() && isCreatingNew && (
                                                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}>
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                                Bitte gib einen Produktnamen ein
                                                            </p>
                                                        )}
                                                    </div>
                                                    {/* Description - only show for editing existing offers, not for new offers (AI generates it) */}
                                                    {!isCreatingNew && (
                                                        <div>
                                                            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--warm-gray)' }}>Beschreibung</label>
                                                            <textarea
                                                                value={editForm.description}
                                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                                className="w-full px-3 py-2 rounded-lg border resize-none"
                                                                style={{ borderColor: 'var(--sand)', fontFamily: 'var(--font-outfit)', fontSize: '0.875rem' }}
                                                                rows={3}
                                                            />
                                                        </div>
                                                    )}
                                                    {isCreatingNew && (
                                                        <div className="p-3 rounded-lg" style={{ background: 'rgba(107, 142, 122, 0.1)', border: '1px solid rgba(107, 142, 122, 0.2)' }}>
                                                            <p className="text-xs flex items-center gap-2" style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                                </svg>
                                                                Die Beschreibung wird automatisch per KI generiert
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: touchedFields.price && !editForm.price.trim() && isCreatingNew ? 'var(--terracotta)' : 'var(--warm-gray)' }}>
                                                                Preis (€)
                                                                {isCreatingNew && <span style={{ color: 'var(--terracotta)' }}>*</span>}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={editForm.price}
                                                                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                                                                onBlur={() => setTouchedFields(prev => ({ ...prev, price: true }))}
                                                                placeholder="z.B. 2.99"
                                                                className={`w-full px-3 py-2 rounded-lg border transition-colors ${touchedFields.price && !editForm.price.trim() && isCreatingNew ? 'border-[var(--terracotta)] ring-1 ring-[var(--terracotta)]' : ''}`}
                                                                style={{ borderColor: touchedFields.price && !editForm.price.trim() && isCreatingNew ? 'var(--terracotta)' : 'var(--sand)' }}
                                                            />
                                                            {touchedFields.price && !editForm.price.trim() && isCreatingNew && (
                                                                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}>
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Pflichtfeld
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: touchedFields.unit && !editForm.unit.trim() && isCreatingNew ? 'var(--terracotta)' : 'var(--warm-gray)' }}>
                                                                Einheit
                                                                {isCreatingNew && <span style={{ color: 'var(--terracotta)' }}>*</span>}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={editForm.unit}
                                                                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                                                onBlur={() => setTouchedFields(prev => ({ ...prev, unit: true }))}
                                                                placeholder="z.B. kg, Stück"
                                                                className={`w-full px-3 py-2 rounded-lg border transition-colors ${touchedFields.unit && !editForm.unit.trim() && isCreatingNew ? 'border-[var(--terracotta)] ring-1 ring-[var(--terracotta)]' : ''}`}
                                                                style={{ borderColor: touchedFields.unit && !editForm.unit.trim() && isCreatingNew ? 'var(--terracotta)' : 'var(--sand)' }}
                                                            />
                                                            {touchedFields.unit && !editForm.unit.trim() && isCreatingNew && (
                                                                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}>
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Pflichtfeld
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Category Dropdown */}
                                                    <div>
                                                        <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: touchedFields.ai_category && !editForm.ai_category && isCreatingNew ? 'var(--terracotta)' : 'var(--warm-gray)' }}>
                                                            Kategorie
                                                            {isCreatingNew && <span style={{ color: 'var(--terracotta)' }}>*</span>}
                                                        </label>
                                                        <select
                                                            value={editForm.ai_category}
                                                            onChange={(e) => setEditForm({ ...editForm, ai_category: e.target.value })}
                                                            onBlur={() => setTouchedFields(prev => ({ ...prev, ai_category: true }))}
                                                            className={`w-full px-3 py-2 rounded-lg border transition-colors ${touchedFields.ai_category && !editForm.ai_category && isCreatingNew ? 'border-[var(--terracotta)] ring-1 ring-[var(--terracotta)]' : ''}`}
                                                            style={{ borderColor: touchedFields.ai_category && !editForm.ai_category && isCreatingNew ? 'var(--terracotta)' : 'var(--sand)', fontFamily: 'var(--font-outfit)' }}
                                                        >
                                                            <option value="">Bitte wählen...</option>
                                                            <option value="Obst & Gemüse">Obst & Gemüse</option>
                                                            <option value="Fleisch & Wurst">Fleisch & Wurst</option>
                                                            <option value="Milchprodukte">Milchprodukte</option>
                                                            <option value="Backwaren">Backwaren</option>
                                                            <option value="Getränke">Getränke</option>
                                                            <option value="Sonstiges">Sonstiges</option>
                                                        </select>
                                                        {touchedFields.ai_category && !editForm.ai_category && isCreatingNew && (
                                                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}>
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                                Pflichtfeld
                                                            </p>
                                                        )}
                                                    </div>
                                                    {/* Expiry Date */}
                                                    <div>
                                                        <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--warm-gray)' }}>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            Gültig bis
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={editForm.expires_at}
                                                            onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            className="w-full px-3 py-2 rounded-lg border transition-colors"
                                                            style={{ borderColor: 'var(--sand)', fontFamily: 'var(--font-outfit)' }}
                                                        />
                                                    </div>
                                                    {/* Image required indicator for new offers */}
                                                    {isCreatingNew && touchedFields.image_id && !editForm.image_id && (
                                                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}>
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                            Bitte wähle ein Bild aus
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Edit Action Buttons */}
                                                <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                                                    <button
                                                        onClick={() => handleSaveEdit(offer.id)}
                                                        disabled={savingEdit || (isCreatingNew && !isFormValid())}
                                                        className="flex-1 py-2 rounded-xl font-semibold transition-all hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        style={{ background: 'var(--cardamom)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        {savingEdit ? (
                                                            <>
                                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                </svg>
                                                                <span>{generatingDescription ? 'KI generiert...' : 'Wird gespeichert...'}</span>
                                                            </>
                                                        ) : (
                                                            isCreatingNew ? 'Angebot erstellen' : 'Speichern'
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="flex-1 py-2 rounded-xl font-semibold transition-all hover:opacity-90 cursor-pointer"
                                                        style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        Abbrechen
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* View Mode */}
                                                {/* Product Name */}
                                                <h4 className="font-bold text-lg" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                                    {offer.product_name}
                                                </h4>

                                                {/* AI Description */}
                                                {offer.description && (
                                                    <p className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                                        {offer.description}
                                                    </p>
                                                )}

                                                {/* Price with Unit */}
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl font-black" style={{ color: 'var(--terracotta)' }}>
                                                        {offer.price} €
                                                    </span>
                                                    {offer.unit && (
                                                        <span className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                            / {offer.unit}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Market Info */}
                                                {market && (
                                                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                        <span>{market.name} • {market.city}</span>
                                                    </div>
                                                )}

                                                {/* Dates */}
                                                <div className="text-xs space-y-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        Erstellt: {createdDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Gültig bis: {expiresDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                    </div>
                                                </div>

                                                {/* Publish Button */}
                                                <div className="pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                                                    <button
                                                        onClick={() => setPublishConfirmId(offer.id)}
                                                        disabled={isPublishing}
                                                        className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                                                        style={{ fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        {isPublishing ? (
                                                            <>
                                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                                </svg>
                                                                <span>Wird veröffentlicht...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <span>Veröffentlichen</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="glass-card max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(225, 139, 85, 0.1)' }}>
                                <svg className="w-6 h-6" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Angebot löschen?
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Diese Aktion kann nicht rückgängig gemacht werden.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-90 cursor-pointer"
                                style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-90 cursor-pointer"
                                style={{ background: 'var(--terracotta)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                            >
                                Löschen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Gallery Modal */}
            {showImageGallery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="glass-card max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b" style={{ borderColor: 'var(--sand)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                        Bild auswählen
                                    </h3>
                                    <p className="text-sm mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Wähle ein Bild aus der Bibliothek oder lade ein neues hoch
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowImageGallery(false)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
                                    style={{ background: 'var(--sand)', color: 'var(--charcoal)' }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Upload Section */}
                        <div className="p-6 border-b" style={{ borderColor: 'var(--sand)' }}>
                            <label className="block">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={uploadingImage}
                                />
                                <div
                                    className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-[var(--saffron)]"
                                    style={{ borderColor: 'rgba(230, 168, 69, 0.5)' }}
                                >
                                    {uploadingImage ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>Wird hochgeladen...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--saffron)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="font-semibold mb-1" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                                Neues Bild hochladen
                                            </p>
                                            <p className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                                Klicken oder Datei hierher ziehen
                                            </p>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>

                        {/* Image Library Grid */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Search Bar */}
                            <div className="mb-4">
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={imageSearchQuery}
                                        onChange={(e) => setImageSearchQuery(e.target.value)}
                                        placeholder="Nach Produktname suchen..."
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-2"
                                        style={{
                                            borderColor: 'var(--sand)',
                                            fontFamily: 'var(--font-outfit)',
                                            '--tw-ring-color': 'var(--saffron)'
                                        } as React.CSSProperties}
                                    />
                                </div>
                            </div>

                            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                Bild-Bibliothek ({libraryImages.filter(img =>
                                    img.product_name.toLowerCase().includes(imageSearchQuery.toLowerCase())
                                ).length})
                            </h4>
                            {libraryImages.filter(img =>
                                img.product_name.toLowerCase().includes(imageSearchQuery.toLowerCase())
                            ).length === 0 ? (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        {imageSearchQuery ? 'Keine Bilder gefunden' : 'Keine Bilder in der Bibliothek'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {libraryImages
                                        .filter(img => img.product_name.toLowerCase().includes(imageSearchQuery.toLowerCase()))
                                        .map((image) => (
                                            <button
                                                key={image.id}
                                                onClick={() => handleSelectLibraryImage(image.id)}
                                                className={`relative aspect-square rounded-xl overflow-hidden transition-all cursor-pointer ${editForm.image_id === image.id
                                                    ? 'ring-4 ring-[var(--saffron)] ring-offset-2'
                                                    : 'hover:scale-105'
                                                    }`}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.product_name}
                                                    className="w-full h-full object-cover"
                                                />
                                                {editForm.image_id === image.id && (
                                                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(230, 168, 69, 0.2)' }}>
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--saffron)' }}>
                                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 p-2 text-xs truncate" style={{ background: 'rgba(0,0,0,0.7)', color: 'white', fontFamily: 'var(--font-outfit)' }}>
                                                    {image.product_name}
                                                </div>
                                            </button>
                                        ))}                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Publish Confirmation Modal */}
            {publishConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="glass-card max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(107, 142, 122, 0.1)' }}>
                                <svg className="w-6 h-6" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Angebot veröffentlichen?
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Das Angebot wird für Kunden sichtbar.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setPublishConfirmId(null)}
                                className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-90 cursor-pointer"
                                style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                            >
                                Abbrechen
                            </button>
                            <button
                                onClick={() => publishConfirmId && handlePublish(publishConfirmId)}
                                className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-90 cursor-pointer"
                                style={{ background: 'var(--cardamom)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                            >
                                Veröffentlichen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
