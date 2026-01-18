'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
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
}

export default function FavoritesPage() {
    const { favorites, isLoaded, hasFavorites } = useFavorites();
    const [markets, setMarkets] = useState<Market[]>([]);
    const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);

    // Fetch favorite markets from Supabase
    useEffect(() => {
        const fetchFavoriteMarkets = async () => {
            if (!isLoaded) return;

            if (favorites.length === 0) {
                setMarkets([]);
                setIsLoadingMarkets(false);
                return;
            }

            setIsLoadingMarkets(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from('markets')
                .select('id, slug, name, city, header_url, logo_url, about_text, is_premium, zip_code')
                .in('id', favorites);

            if (error) {
                console.error('Error fetching favorite markets:', error);
                setMarkets([]);
            } else {
                // Sort markets in the same order as favorites array
                const sortedMarkets = favorites
                    .map(favId => data?.find(m => m.id === favId))
                    .filter((m): m is Market => m !== undefined);
                setMarkets(sortedMarkets);
            }
            setIsLoadingMarkets(false);
        };

        fetchFavoriteMarkets();
    }, [favorites, isLoaded]);

    // Loading state
    if (!isLoaded || isLoadingMarkets) {
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
                            <h1
                                className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 animate-fade-in-up leading-tight"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                <span className="text-gradient-warm">Meine Favoriten</span>
                            </h1>
                            <p className="text-lg sm:text-xl text-white/70 max-w-xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                Laden...
                            </p>
                        </div>
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
                                {/* Heart Badge */}
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
                                    style={{
                                        background: 'rgba(225, 139, 85, 0.15)',
                                        border: '1px solid rgba(225, 139, 85, 0.3)'
                                    }}
                                >
                                    <svg
                                        className="w-4 h-4"
                                        viewBox="0 0 24 24"
                                        fill="#E18B55"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                    <span className="text-sm font-semibold" style={{ color: '#E18B55' }}>
                                        {markets.length} {markets.length === 1 ? 'Favorit' : 'Favoriten'}
                                    </span>
                                </div>

                                <h1
                                    className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 animate-fade-in-up leading-tight"
                                    style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                                >
                                    <span className="text-gradient-warm">Meine Favoriten</span>
                                </h1>
                                <p
                                    className="text-lg sm:text-xl text-white/70 max-w-xl animate-fade-in-up"
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    {hasFavorites
                                        ? 'Deine gespeicherten Lieblingsmärkte auf einen Blick.'
                                        : 'Du hast noch keine Favoriten gespeichert.'}
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

            {/* Content Section */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {!hasFavorites ? (
                    /* Empty State */
                    <div className="text-center py-16 sm:py-24">
                        <div className="relative w-32 h-32 mx-auto mb-8">
                            <div
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ background: 'var(--saffron)', animationDuration: '2s' }}
                            />
                            <div
                                className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl"
                                style={{ background: 'white', boxShadow: '0 20px 60px rgba(225, 139, 85, 0.3)' }}
                            >
                                <svg
                                    className="w-14 h-14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#E18B55"
                                    strokeWidth="1.5"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                    />
                                </svg>
                            </div>
                        </div>

                        <h2
                            className="text-3xl sm:text-4xl font-black mb-4"
                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                        >
                            Noch keine Favoriten
                        </h2>

                        <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: 'var(--warm-gray)' }}>
                            Klicke auf das Herz-Symbol bei einem Markt, um ihn zu deinen Favoriten hinzuzufügen.
                        </p>

                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105"
                            style={{ background: 'var(--gradient-warm)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Märkte entdecken
                        </Link>
                    </div>
                ) : (
                    /* Favorites Grid */
                    <div className="animate-fade-in-up">
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {markets.map((market, idx) => (
                                <MarketCardWithFavorite
                                    key={market.id}
                                    market={market}
                                    index={idx}
                                    variant={market.is_premium ? 'premium' : 'new'}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
