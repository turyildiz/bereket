'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface DraftOffer {
    id: string;
    product_name: string;
    description: string | null;
    price: string;
    unit: string | null;
    image_url: string | null;
    expires_at: string;
    created_at: string;
    market_id: string;
    markets: {
        id: string;
        name: string;
        city: string;
    } | null;
}

interface OfferReviewProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

export default function OfferReview({ showToast }: OfferReviewProps) {
    const [draftOffers, setDraftOffers] = useState<DraftOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishingId, setPublishingId] = useState<string | null>(null);

    const supabase = createClient();

    const fetchDraftOffers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('offers')
                .select('id, product_name, description, price, unit, image_url, expires_at, created_at, market_id, markets(id, name, city)')
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
    }, [supabase, showToast]);

    useEffect(() => {
        fetchDraftOffers();
    }, [fetchDraftOffers]);

    const handlePublish = async (offerId: string) => {
        setPublishingId(offerId);

        try {
            const { error } = await supabase
                .from('offers')
                .update({ status: 'live' })
                .eq('id', offerId);

            if (error) {
                showToast('Fehler beim Veröffentlichen: ' + error.message, 'error');
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                        Angebote Prüfen
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                        {draftOffers.length} {draftOffers.length === 1 ? 'Angebot wartet' : 'Angebote warten'} auf Freigabe
                    </p>
                </div>
                <button
                    onClick={() => fetchDraftOffers()}
                    className="px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-80 cursor-pointer flex items-center gap-2"
                    style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Aktualisieren
                </button>
            </div>

            {/* Draft Offers List */}
            {draftOffers.length === 0 ? (
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
                    {draftOffers.map((offer) => {
                        const market = offer.markets;
                        const expiresDate = new Date(offer.expires_at);
                        const createdDate = new Date(offer.created_at);
                        const isPublishing = publishingId === offer.id;

                        return (
                            <div
                                key={offer.id}
                                className="glass-card overflow-hidden"
                                style={{ border: '2px solid rgba(230, 168, 69, 0.3)' }}
                            >
                                {/* Image */}
                                <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#f8f5f0' }}>
                                    <img
                                        src={offer.image_url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600'}
                                        alt={offer.product_name}
                                        className="w-full h-full object-contain"
                                    />
                                    <div
                                        className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold"
                                        style={{ background: 'var(--saffron)', color: 'white', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        Entwurf
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-3">
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

                                    {/* Action Buttons */}
                                    <div className="pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                                        <button
                                            onClick={() => handlePublish(offer.id)}
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
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
