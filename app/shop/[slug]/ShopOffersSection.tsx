'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface Offer {
    id: string;
    product_name: string;
    price: string | number;
    unit?: string | null;
    description?: string | null;
    ai_category?: string | null;
    image_library: {
        url: string;
    } | null;
    expires_at: string;
    created_at: string;
}

const CATEGORIES = [
    { id: 'all', label: 'Alle', icon: '🛒' },
    { id: 'Obst & Gemüse', label: 'Obst & Gemüse', icon: '🥬' },
    { id: 'Fleisch & Wurst', label: 'Fleisch & Wurst', icon: '🥩' },
    { id: 'Milchprodukte', label: 'Milchprodukte', icon: '🧀' },
    { id: 'Backwaren', label: 'Backwaren', icon: '🥖' },
    { id: 'Getränke', label: 'Getränke', icon: '🥤' },
    { id: 'Sonstiges', label: 'Sonstiges', icon: '📦' },
];

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
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const loadMoreRef = useRef<HTMLDivElement>(null);
    const categoryScrollRef = useRef<HTMLDivElement>(null);
    const [showScrollButtons, setShowScrollButtons] = useState(false);

    // Check if scroll buttons are needed
    useEffect(() => {
        const checkScrollNeeded = () => {
            if (categoryScrollRef.current) {
                const { scrollWidth, clientWidth } = categoryScrollRef.current;
                setShowScrollButtons(scrollWidth > clientWidth);
            }
        };

        checkScrollNeeded();
        window.addEventListener('resize', checkScrollNeeded);
        return () => window.removeEventListener('resize', checkScrollNeeded);
    }, [offers]);

    // Scroll category bar left/right
    const scrollCategories = (direction: 'left' | 'right') => {
        if (categoryScrollRef.current) {
            const scrollAmount = 200;
            categoryScrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

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
                .eq('status', 'live')
                .gt('expires_at', new Date().toISOString());

            setTotalCount(count);

            // Fetch initial batch
            const { data, error } = await supabase
                .from('offers')
                .select('id, product_name, price, unit, description, ai_category, expires_at, created_at, image_library(url)')
                .eq('market_id', marketId)
                .eq('status', 'live')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .range(0, INITIAL_LOAD - 1);

            if (error) {
                console.error('Error fetching offers:', error);
                setOffers([]);
            } else {
                setOffers((data as unknown as Offer[]) || []);
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
            .select('id, product_name, price, unit, description, ai_category, expires_at, created_at, image_library(url)')
            .eq('market_id', marketId)
            .eq('status', 'live')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) {
            console.error('Error loading more offers:', error);
        } else if (data) {
            setOffers((prev) => [...prev, ...((data as unknown as Offer[]) || [])]);
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

    // Filter offers by selected category
    const filteredOffers = selectedCategory === 'all'
        ? offers
        : offers.filter(offer => offer.ai_category === selectedCategory);

    // Count offers per category for badge display
    const getCategoryCount = (categoryId: string) => {
        if (categoryId === 'all') return offers.length;
        return offers.filter(offer => offer.ai_category === categoryId).length;
    };

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

            {/* Category Filter Navigation */}
            {!isLoading && offers.length > 0 && (
                <div className="mb-6 animate-fade-in-up relative" style={{ animationDelay: '0.05s' }}>
                    {/* Left scroll button - desktop only, hidden if no scroll needed */}
                    {showScrollButtons && (
                        <button
                            onClick={() => scrollCategories('left')}
                            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:scale-110"
                            style={{ marginLeft: '-4px' }}
                            aria-label="Scroll left"
                        >
                            <svg className="w-4 h-4" style={{ color: 'var(--charcoal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    <div
                        ref={categoryScrollRef}
                        className={`flex gap-2 pb-2 overflow-x-auto ${showScrollButtons ? 'md:mx-8' : ''}`}
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        {CATEGORIES.filter((category) => {
                            // Always show "Alle", hide other categories with no offers
                            if (category.id === 'all') return true;
                            return getCategoryCount(category.id) > 0;
                        }).map((category) => {
                            const count = getCategoryCount(category.id);
                            const isActive = selectedCategory === category.id;

                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                                        whitespace-nowrap transition-all duration-200 flex-shrink-0
                                        ${isActive
                                            ? 'shadow-lg scale-[1.02]'
                                            : 'hover:scale-[1.02] hover:shadow-md'
                                        }
                                    `}
                                    style={{
                                        background: isActive
                                            ? 'var(--gradient-warm)'
                                            : 'rgba(255, 255, 255, 0.8)',
                                        color: isActive ? 'white' : 'var(--charcoal)',
                                        border: isActive
                                            ? 'none'
                                            : '1px solid rgba(255, 255, 255, 0.5)',
                                        backdropFilter: 'blur(10px)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <span className="text-base">{category.icon}</span>
                                    <span>{category.label}</span>
                                    <span
                                        className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                        style={{
                                            background: isActive
                                                ? 'rgba(255, 255, 255, 0.25)'
                                                : 'var(--sand)',
                                            color: isActive ? 'white' : 'var(--warm-gray)'
                                        }}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right scroll button - desktop only, hidden if no scroll needed */}
                    {showScrollButtons && (
                        <button
                            onClick={() => scrollCategories('right')}
                            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:scale-110"
                            style={{ marginRight: '-4px' }}
                            aria-label="Scroll right"
                        >
                            <svg className="w-4 h-4" style={{ color: 'var(--charcoal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--saffron)] border-t-transparent"></div>
                </div>
            ) : offers.length > 0 ? (
                <>
                    {/* Offers Grid or Category Empty State */}
                    {filteredOffers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {filteredOffers.map((offer, idx) => (
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
                                <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#f8f5f0' }}>
                                    <img
                                        src={offer.image_library?.url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=400'}
                                        alt={offer.product_name}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
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

                                    {/* AI-generated description */}
                                    {offer.description && (
                                        <p className="text-sm mb-3" style={{ color: 'var(--warm-gray)' }}>
                                            {offer.description}
                                        </p>
                                    )}

                                    <p className="text-xs mb-4" style={{ color: 'var(--warm-gray)', opacity: 0.8 }}>
                                        {offer.expires_at
                                            ? `Gültig bis ${new Date(offer.expires_at).toLocaleDateString('de-DE')}`
                                            : 'Nur solange Vorrat reicht.'}
                                    </p>

                                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                                        <div>
                                            <span
                                                className="text-2xl font-black"
                                                style={{ color: 'var(--terracotta)' }}
                                            >
                                                {typeof offer.price === 'number' ? offer.price.toFixed(2) : offer.price} €
                                            </span>
                                            {offer.unit && (
                                                <span className="text-sm ml-1" style={{ color: 'var(--warm-gray)' }}>
                                                    / {offer.unit}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    ) : (
                        /* Category Empty State */
                        <div
                            className="text-center py-12 px-8 rounded-3xl animate-fade-in-up"
                            style={{
                                background: 'rgba(255, 255, 255, 0.7)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.5)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
                            }}
                        >
                            <div
                                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl shadow-md"
                                style={{ background: 'var(--sand)' }}
                            >
                                {CATEGORIES.find(c => c.id === selectedCategory)?.icon || '📦'}
                            </div>
                            <h3
                                className="text-xl font-bold mb-2"
                                style={{
                                    fontFamily: 'var(--font-playfair)',
                                    color: 'var(--charcoal)'
                                }}
                            >
                                Momentan keine Angebote in dieser Kategorie.
                            </h3>
                            <p className="text-sm mb-4" style={{ color: 'var(--warm-gray)' }}>
                                Schauen Sie in anderen Kategorien oder bald wieder vorbei!
                            </p>
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:scale-105 cursor-pointer"
                                style={{ background: 'var(--gradient-warm)', color: 'white' }}
                            >
                                Alle Angebote anzeigen
                            </button>
                        </div>
                    )}

                    {/* Load More Trigger */}
                    <div ref={loadMoreRef} className="py-6">
                        {isLoadingMore && (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--saffron)] border-t-transparent"></div>
                            </div>
                        )}
                        {!hasMore && offers.length > 0 && totalCount !== null && totalCount > INITIAL_LOAD && selectedCategory === 'all' && (
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
