'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import MarketCardWithFavorite from '@/app/components/MarketCardWithFavorite';

interface Market {
    id: string;
    slug: string;
    name: string;
    city: string;
    header_url: string | null;
    logo_url: string | null;
    about_text: string | null;
    is_premium: boolean;
    zip_code: string | null;
    created_at: string;
}

const INITIAL_LOAD = 18;
const LOAD_MORE = 12;

export default function PremiumShopsPage() {
    const [markets, setMarkets] = useState<Market[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState<number | null>(null);

    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Initial load
    useEffect(() => {
        const fetchInitialMarkets = async () => {
            setIsLoading(true);
            const supabase = createClient();

            // Get total count of premium markets
            const { count } = await supabase
                .from('markets')
                .select('*', { count: 'exact', head: true })
                .eq('is_premium', true);

            setTotalCount(count);

            // Fetch initial batch
            const { data, error } = await supabase
                .from('markets')
                .select('id, slug, name, city, header_url, logo_url, about_text, is_premium, zip_code, created_at')
                .eq('is_premium', true)
                .order('created_at', { ascending: false })
                .range(0, INITIAL_LOAD - 1);

            if (error) {
                console.error('Error fetching markets:', error);
                setMarkets([]);
            } else {
                setMarkets(data || []);
                setHasMore((data?.length || 0) >= INITIAL_LOAD && (count || 0) > INITIAL_LOAD);
            }
            setIsLoading(false);
        };

        fetchInitialMarkets();
    }, []);

    // Load more markets
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        const supabase = createClient();

        const start = markets.length;
        const end = start + LOAD_MORE - 1;

        const { data, error } = await supabase
            .from('markets')
            .select('id, slug, name, city, header_url, logo_url, about_text, is_premium, zip_code, created_at')
            .eq('is_premium', true)
            .order('created_at', { ascending: false })
            .range(start, end);

        if (error) {
            console.error('Error loading more markets:', error);
        } else if (data) {
            setMarkets((prev) => [...prev, ...data]);
            setHasMore(data.length >= LOAD_MORE && (totalCount || 0) > start + data.length);
        }
        setIsLoadingMore(false);
    }, [markets.length, isLoadingMore, hasMore, totalCount]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [loadMore, hasMore, isLoadingMore]);

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
                    style={{ background: 'var(--saffron)' }}
                />
                <div
                    className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
                    style={{ background: 'var(--terracotta)' }}
                />

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="pt-8 pb-4">
                        <Link
                            href="/shops"
                            className="group inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"
                        >
                            <span className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:-translate-x-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </span>
                            <span className="text-sm font-medium">Alle Märkte</span>
                        </Link>
                    </div>

                    <div className="py-12 sm:py-16 lg:py-20">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                            <div className="flex-1">
                                {/* Premium Badge */}
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
                                    style={{
                                        background: 'rgba(225, 139, 85, 0.15)',
                                        border: '1px solid rgba(225, 139, 85, 0.3)'
                                    }}
                                >
                                    <svg className="w-4 h-4" style={{ color: '#E18B55' }} fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span className="text-sm font-semibold" style={{ color: '#E18B55' }}>
                                        {totalCount !== null ? `${totalCount} Premium Partner` : 'Premium Partner'}
                                    </span>
                                </div>

                                <h1
                                    className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 animate-fade-in-up leading-tight"
                                    style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                                >
                                    <span className="text-gradient-warm">Premium Partner</span>
                                </h1>
                                <p
                                    className="text-lg sm:text-xl text-white/70 max-w-xl animate-fade-in-up"
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    Handverlesene Märkte mit besonders hoher Qualität, erstklassigem Service und exklusiven Angeboten.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="var(--cream)" />
                    </svg>
                </div>
            </section>

            {/* Markets Grid */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saffron)] border-t-transparent"></div>
                    </div>
                ) : markets.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {markets.map((market, idx) => (
                                <MarketCardWithFavorite
                                    key={market.id}
                                    market={market}
                                    index={idx < INITIAL_LOAD ? idx : 0}
                                    variant="premium"
                                />
                            ))}
                        </div>

                        {/* Load More Trigger */}
                        <div ref={loadMoreRef} className="py-8">
                            {isLoadingMore && (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--saffron)] border-t-transparent"></div>
                                </div>
                            )}
                            {!hasMore && markets.length > 0 && (
                                <p className="text-center text-sm" style={{ color: 'var(--warm-gray)' }}>
                                    Alle {totalCount} Premium Partner geladen
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                            <svg className="w-10 h-10" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--charcoal)' }}>
                            Noch keine Premium Partner
                        </h2>
                        <p className="text-lg mb-6" style={{ color: 'var(--warm-gray)' }}>
                            Bald findest du hier unsere handverlesenen Premium Partner.
                        </p>
                        <Link
                            href="/shops"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105"
                            style={{ background: 'var(--gradient-warm)', color: 'white' }}
                        >
                            Alle Märkte ansehen
                        </Link>
                    </div>
                )}
            </section>
        </main>
    );
}
