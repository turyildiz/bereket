'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Offer {
    id: string;
    product_name: string;
    price: string | number;
    image_url: string | null;
    expires_at: string;
    created_at: string;
}

interface ShopOffersSectionProps {
    marketId: string;
    marketName: string;
}

const INITIAL_LOAD = 12;
const LOAD_MORE = 6;

// Helper to format currency
const formatPrice = (price: number | string) => {
    if (typeof price === 'number') {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price);
    }
    return price;
};

export default function ShopOffersSection({ marketId, marketName }: ShopOffersSectionProps) {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState<number | null>(null);

    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        const fetchInitialOffers = async () => {
            setIsLoading(true);
            const supabase = createClient();

            // Get total count for this market
            const { count } = await supabase
                .from('offers')
                .select('*', { count: 'exact', head: true })
                .eq('market_id', marketId)
                .gt('expires_at', new Date().toISOString());

            setTotalCount(count);

            // Fetch initial batch
            const { data, error } = await supabase
                .from('offers')
                .select('id, product_name, price, image_url, expires_at, created_at')
                .eq('market_id', marketId)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .range(0, INITIAL_LOAD - 1);

            if (error) {
                console.error('Error fetching offers:', error);
                setOffers([]);
            } else {
                setOffers(data || []);
                setHasMore((data?.length || 0) >= INITIAL_LOAD && (count || 0) > INITIAL_LOAD);
            }
            setIsLoading(false);
        };

        fetchInitialOffers();
    }, [marketId]);

    // Load more offers
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        const supabase = createClient();

        const start = offers.length;
        const end = start + LOAD_MORE - 1;

        const { data, error } = await supabase
            .from('offers')
            .select('id, product_name, price, image_url, expires_at, created_at')
            .eq('market_id', marketId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) {
            console.error('Error loading more offers:', error);
        } else if (data) {
            setOffers((prev) => [...prev, ...data]);
            setHasMore(data.length >= LOAD_MORE && (totalCount || 0) > start + data.length);
        }
        setIsLoadingMore(false);
    }, [offers.length, isLoadingMore, hasMore, totalCount, marketId]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [loadMore, hasMore, isLoadingMore, isLoading]);

    return (
        <div className="min-w-0">
            {/* Offers Header */}
            <div className="mb-8 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2
                            className="text-2xl sm:text-3xl font-bold mb-2"
                            style={{
                                fontFamily: 'var(--font-playfair)',
                                color: 'var(--charcoal)'
                            }}
                        >
                            Aktuelle Angebote
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                            {isLoading
                                ? 'Laden...'
                                : totalCount !== null && totalCount > 0
                                    ? `${totalCount} Angebote verfügbar`
                                    : 'Keine aktuellen Angebote'}
                        </p>
                    </div>
                    <div
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold cursor-default"
                        style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(10px)',
                            color: 'var(--warm-gray)',
                            border: '1px solid rgba(255, 255, 255, 0.5)'
                        }}
                    >
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--cardamom)' }}></span>
                        KI-aktualisiert
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--saffron)] border-t-transparent"></div>
                </div>
            ) : offers.length > 0 ? (
                <>
                    {/* Offers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {offers.map((offer, idx) => (
                            <div
                                key={offer.id}
                                className="group relative rounded-3xl overflow-hidden cursor-pointer hover-lift animate-scale-in"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                                    animationDelay: idx < INITIAL_LOAD ? `${0.1 + idx * 0.05}s` : '0s'
                                }}
                            >
                                {/* Image */}
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={offer.image_url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=400'}
                                        alt={offer.product_name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3
                                        className="font-bold text-xl mb-2"
                                        style={{
                                            fontFamily: 'var(--font-playfair)',
                                            color: 'var(--charcoal)'
                                        }}
                                    >
                                        {offer.product_name}
                                    </h3>

                                    <p className="text-sm mb-4" style={{ color: 'var(--warm-gray)' }}>
                                        {offer.expires_at
                                            ? `Gültig bis ${new Date(offer.expires_at).toLocaleDateString('de-DE')}`
                                            : 'Nur solange Vorrat reicht.'}
                                    </p>

                                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                                        <span
                                            className="text-2xl font-black"
                                            style={{ color: 'var(--terracotta)' }}
                                        >
                                            {formatPrice(offer.price)}
                                        </span>
                                        <span
                                            className="text-xs px-3 py-1 rounded-full font-semibold"
                                            style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}
                                        >
                                            Verfügbar
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load More Trigger */}
                    <div ref={loadMoreRef} className="py-6">
                        {isLoadingMore && (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--saffron)] border-t-transparent"></div>
                            </div>
                        )}
                        {!hasMore && offers.length > 0 && totalCount !== null && totalCount > INITIAL_LOAD && (
                            <p className="text-center text-sm" style={{ color: 'var(--warm-gray)' }}>
                                Alle {totalCount} Angebote geladen
                            </p>
                        )}
                    </div>
                </>
            ) : (
                /* Empty State - Glassmorphism Card */
                <div
                    className="text-center py-16 px-8 rounded-3xl animate-fade-in-up"
                    style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
                    }}
                >
                    <div
                        className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl shadow-lg"
                        style={{ background: 'var(--gradient-warm)' }}
                    >
                        📦
                    </div>
                    <h3
                        className="text-2xl font-bold mb-3"
                        style={{
                            fontFamily: 'var(--font-playfair)',
                            color: 'var(--charcoal)'
                        }}
                    >
                        Keine Angebote verfügbar
                    </h3>
                    <p className="mb-6 text-lg" style={{ color: 'var(--warm-gray)' }}>
                        Schauen Sie bald wieder vorbei!
                    </p>
                    <button
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 cursor-pointer"
                        style={{ background: 'var(--charcoal)', color: 'white' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Benachrichtigung aktivieren
                    </button>
                </div>
            )}
        </div>
    );
}
