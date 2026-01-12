'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';

interface Offer {
    id: string;
    product_name: string;
    price: string;
    image_url: string | null;
    expires_at: string;
    market_id: string;
    created_at: string;
    markets: {
        id: string;
        name: string;
        city: string;
    } | null;
}

const INITIAL_LOAD = 18;
const LOAD_MORE = 12;

function OffersPageContent() {
    const searchParams = useSearchParams();
    const showFavoritesOnly = searchParams.get('favorites') === 'true';

    const { favorites, isLoaded, hasFavorites } = useFavorites();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [filterMode, setFilterMode] = useState<'all' | 'favorites'>(showFavoritesOnly ? 'favorites' : 'all');

    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Initial load - depends on favorites loading first
    useEffect(() => {
        if (!isLoaded) return;

        const fetchInitialOffers = async () => {
            setIsLoading(true);
            setOffers([]);
            const supabase = createClient();

            // Build base query for count
            let countQuery = supabase
                .from('offers')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'live')
                .gt('expires_at', new Date().toISOString());

            // Filter by favorites if applicable
            if (filterMode === 'favorites' && hasFavorites && favorites.length > 0) {
                countQuery = countQuery.in('market_id', favorites);
            }

            const { count } = await countQuery;
            setTotalCount(count);

            // Build data query
            let dataQuery = supabase
                .from('offers')
                .select('id, product_name, price, image_url, expires_at, market_id, created_at, markets(id, name, city)')
                .eq('status', 'live')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .range(0, INITIAL_LOAD - 1);

            if (filterMode === 'favorites' && hasFavorites && favorites.length > 0) {
                dataQuery = dataQuery.in('market_id', favorites);
            }

            const { data, error } = await dataQuery;

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
    }, [isLoaded, favorites, hasFavorites, filterMode]);

    // Load more offers
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || !isLoaded) return;

        setIsLoadingMore(true);
        const supabase = createClient();

        const start = offers.length;
        const end = start + LOAD_MORE - 1;

        let query = supabase
            .from('offers')
            .select('id, product_name, price, image_url, expires_at, market_id, created_at, markets(id, name, city)')
            .eq('status', 'live')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .range(start, end);

        if (filterMode === 'favorites' && hasFavorites && favorites.length > 0) {
            query = query.in('market_id', favorites);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading more offers:', error);
        } else if (data) {
            setOffers((prev) => [...prev, ...(data as unknown as Offer[])]);
            setHasMore(data.length >= LOAD_MORE && (totalCount || 0) > start + data.length);
        }
        setIsLoadingMore(false);
    }, [offers.length, isLoadingMore, hasMore, totalCount, filterMode, favorites, hasFavorites, isLoaded]);

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

    // Determine page title and subtitle
    const pageTitle = filterMode === 'favorites' && hasFavorites ? 'Angebote deiner Favoriten' : 'Alle Angebote';
    const pageSubtitle = filterMode === 'favorites' && hasFavorites
        ? 'Aktuelle Deals von deinen Lieblingsmärkten.'
        : 'Alle aktuellen Angebote unserer Partner-Märkte.';

    return (
        <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
            {/* Hero Header */}
            <section className="relative overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, #2C2823 0%, #1a1714 50%, #2C2823 100%)'
                    }}
                />
                <div
                    className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
                    style={{ background: 'var(--terracotta)' }}
                />
                <div
                    className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
                    style={{ background: 'var(--saffron)' }}
                />

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="pt-8 pb-4">
                        <Link
                            href="/"
                            className="group inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"
                        >
                            <span className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:-translate-x-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Zurück zur Startseite</span>
                        </Link>
                    </div>

                    <div className="py-12 sm:py-16 lg:py-20">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                            <div className="flex-1">
                                {/* Badge */}
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
                                    style={{
                                        background: filterMode === 'favorites' && hasFavorites
                                            ? 'rgba(225, 139, 85, 0.15)'
                                            : 'white',
                                        color: 'var(--terracotta)'
                                    }}
                                >
                                    {filterMode === 'favorites' && hasFavorites ? (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    ) : (
                                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--terracotta)' }}></span>
                                    )}
                                    <span className="text-sm font-bold">
                                        {totalCount !== null ? `${totalCount} Angebote` : 'Angebote'}
                                    </span>
                                </div>

                                <h1
                                    className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 animate-fade-in-up leading-tight"
                                    style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                                >
                                    <span className="text-gradient-warm">{pageTitle}</span>
                                </h1>
                                <p
                                    className="text-lg sm:text-xl text-white/70 max-w-xl animate-fade-in-up"
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    {pageSubtitle}
                                </p>
                            </div>

                            {/* Filter Tabs */}
                            {hasFavorites && (
                                <div className="flex gap-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                    <button
                                        onClick={() => setFilterMode('all')}
                                        className={`px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer ${filterMode === 'all'
                                                ? 'text-white shadow-lg'
                                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                            }`}
                                        style={{
                                            background: filterMode === 'all' ? 'var(--gradient-warm)' : 'transparent'
                                        }}
                                    >
                                        Alle Angebote
                                    </button>
                                    <button
                                        onClick={() => setFilterMode('favorites')}
                                        className={`px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer flex items-center gap-2 ${filterMode === 'favorites'
                                                ? 'text-white shadow-lg'
                                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                            }`}
                                        style={{
                                            background: filterMode === 'favorites' ? 'var(--gradient-warm)' : 'transparent'
                                        }}
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                        Meine Favoriten
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="var(--cream)" />
                    </svg>
                </div>
            </section>

            {/* Offers Grid */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {!isLoaded || isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saffron)] border-t-transparent"></div>
                    </div>
                ) : offers.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {offers.map((offer, idx) => {
                                const marketData = offer.markets;
                                const marketName = marketData?.name || 'Lokaler Markt';
                                const expiresDate = new Date(offer.expires_at);
                                const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                                return (
                                    <Link
                                        href={marketData ? `/shop/${marketData.id}` : '#'}
                                        key={offer.id}
                                        className="group relative rounded-3xl overflow-hidden cursor-pointer hover-lift animate-scale-in block"
                                        style={{
                                            background: 'white',
                                            boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
                                            animationDelay: idx < INITIAL_LOAD ? `${idx * 0.03}s` : '0s'
                                        }}
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-[4/3] overflow-hidden">
                                            <img
                                                src={offer.image_url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600'}
                                                alt={offer.product_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {/* Expiry Badge */}
                                            {daysLeft <= 3 && (
                                                <div
                                                    className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
                                                    style={{ background: 'var(--terracotta)', color: 'white' }}
                                                >
                                                    {daysLeft <= 0 ? 'Läuft heute ab' : `Noch ${daysLeft} Tag${daysLeft > 1 ? 'e' : ''}`}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-6">
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
                                                Gültig bis {expiresDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} bei {marketName}.
                                            </p>

                                            <div
                                                className="flex items-center justify-between pt-4 border-t"
                                                style={{ borderColor: 'var(--sand)' }}
                                            >
                                                <span
                                                    className="text-2xl font-black"
                                                    style={{ color: 'var(--terracotta)' }}
                                                >
                                                    {offer.price}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                        style={{ background: 'var(--gradient-warm)' }}
                                                    >
                                                        {marketName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
                                                        {marketName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Load More Trigger */}
                        <div ref={loadMoreRef} className="py-8">
                            {isLoadingMore && (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--saffron)] border-t-transparent"></div>
                                </div>
                            )}
                            {!hasMore && offers.length > 0 && (
                                <p className="text-center text-sm" style={{ color: 'var(--warm-gray)' }}>
                                    Alle {totalCount} Angebote geladen
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                            <svg className="w-10 h-10" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--charcoal)' }}>
                            {filterMode === 'favorites' ? 'Keine Angebote von deinen Favoriten' : 'Keine Angebote verfügbar'}
                        </h2>
                        <p className="text-lg mb-6" style={{ color: 'var(--warm-gray)' }}>
                            {filterMode === 'favorites'
                                ? 'Deine Lieblingsmärkte haben aktuell keine aktiven Angebote.'
                                : 'Aktuell sind keine Angebote verfügbar. Schau bald wieder vorbei!'}
                        </p>
                        {filterMode === 'favorites' && (
                            <button
                                onClick={() => setFilterMode('all')}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 cursor-pointer"
                                style={{ background: 'var(--gradient-warm)', color: 'white' }}
                            >
                                Alle Angebote anzeigen
                            </button>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}

// Loading fallback for Suspense
function OffersPageLoading() {
    return (
        <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
            <section className="relative overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, #2C2823 0%, #1a1714 50%, #2C2823 100%)'
                    }}
                />
                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
                    <h1
                        className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4"
                        style={{ fontFamily: 'var(--font-playfair)' }}
                    >
                        <span className="text-gradient-warm">Alle Angebote</span>
                    </h1>
                    <p className="text-lg text-white/70">Laden...</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="var(--cream)" />
                    </svg>
                </div>
            </section>
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saffron)] border-t-transparent"></div>
                </div>
            </section>
        </main>
    );
}

// Wrap with Suspense for useSearchParams
export default function OffersPage() {
    return (
        <Suspense fallback={<OffersPageLoading />}>
            <OffersPageContent />
        </Suspense>
    );
}
