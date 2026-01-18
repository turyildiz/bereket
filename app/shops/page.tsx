'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

// Available cities for dropdown filter
const CITIES = [
    'Alle Städte',
    'Raunheim',
    'Frankfurt am Main',
    'München',
    'Rüsselsheim am Main'
];

export default function AllShopsPage() {
    // All markets from database
    const [allMarkets, setAllMarkets] = useState<Market[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState('Alle Städte');
    const [showPremiumOnly, setShowPremiumOnly] = useState(false);
    const [showNewOnly, setShowNewOnly] = useState(false);

    // Initial load - fetch ALL active markets once
    useEffect(() => {
        const fetchAllMarkets = async () => {
            setIsLoading(true);
            const supabase = createClient();

            const { data, error } = await supabase
                .from('markets')
                .select('id, slug, name, city, header_url, logo_url, about_text, is_premium, zip_code, created_at')
                .eq('is_active', true);

            if (error) {
                console.error('Error fetching markets:', error);
                setAllMarkets([]);
            } else {
                setAllMarkets(data || []);
            }
            setIsLoading(false);
        };

        fetchAllMarkets();
    }, []);

    // Client-side filtering and sorting
    const filteredMarkets = useMemo(() => {
        let result = [...allMarkets];

        // Filter by search query (name or city)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(market =>
                market.name.toLowerCase().includes(query) ||
                market.city.toLowerCase().includes(query) ||
                (market.zip_code && market.zip_code.includes(query))
            );
        }

        // Filter by selected city
        if (selectedCity !== 'Alle Städte') {
            result = result.filter(market => market.city === selectedCity);
        }

        // Filter by premium only
        if (showPremiumOnly) {
            result = result.filter(market => market.is_premium);
        }

        // Filter by new only (created in last 30 days)
        if (showNewOnly) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            result = result.filter(market => new Date(market.created_at) >= thirtyDaysAgo);
        }

        // Sort: Premium first, then by created_at descending
        result.sort((a, b) => {
            // Premium shops first
            if (a.is_premium && !b.is_premium) return -1;
            if (!a.is_premium && b.is_premium) return 1;
            // Then by created_at descending
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return result;
    }, [allMarkets, searchQuery, selectedCity, showPremiumOnly, showNewOnly]);

    // Get unique cities with ZIP codes from actual data for the dropdown
    const availableCities = useMemo(() => {
        // Create a map of city -> zip_code (use first zip found for each city)
        const cityZipMap = new Map<string, string>();
        allMarkets.forEach(m => {
            if (!cityZipMap.has(m.city) && m.zip_code) {
                cityZipMap.set(m.city, m.zip_code);
            }
        });

        // Sort cities alphabetically and format with ZIP code
        const sortedCities = Array.from(cityZipMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([city, zip]) => ({ label: `${zip} ${city}`, value: city }));

        return [{ label: 'Alle Städte', value: 'Alle Städte' }, ...sortedCities];
    }, [allMarkets]);

    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCity('Alle Städte');
        setShowPremiumOnly(false);
        setShowNewOnly(false);
    };

    const hasActiveFilters = searchQuery || selectedCity !== 'Alle Städte' || showPremiumOnly || showNewOnly;

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
                                {/* Dynamic Count Badge */}
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
                                    style={{ background: 'white', color: 'var(--charcoal)' }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="text-sm font-bold">
                                        {isLoading ? 'Laden...' : `${filteredMarkets.length} ${filteredMarkets.length === 1 ? 'Markt' : 'Märkte'}`}
                                    </span>
                                </div>

                                <h1
                                    className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 animate-fade-in-up leading-tight"
                                    style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                                >
                                    <span className="text-gradient-warm">Alle Märkte</span>
                                </h1>
                                <p
                                    className="text-lg sm:text-xl text-white/70 max-w-xl animate-fade-in-up"
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    Entdecke alle Partner-Märkte in unserer Community.
                                </p>
                            </div>

                            {/* Quick Filter Links */}
                            <div className="flex gap-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                <Link
                                    href="/shops/premium"
                                    className="px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer flex items-center gap-2 text-white/60 hover:text-white hover:bg-white/10"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Premium
                                </Link>
                                <Link
                                    href="/shops/new"
                                    className="px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer flex items-center gap-2 text-white/60 hover:text-white hover:bg-white/10"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Neu
                                </Link>
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

            {/* Filter Bar */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                <div
                    className="p-4 sm:p-6 rounded-2xl shadow-lg animate-fade-in-up"
                    style={{
                        background: 'white',
                        border: '1px solid var(--sand)'
                    }}
                >
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1">
                            <div className="relative">
                                <svg
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                                    style={{ color: 'var(--warm-gray)' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Suche nach Name, Stadt oder PLZ..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none"
                                    style={{
                                        borderColor: 'var(--sand)',
                                        background: 'var(--cream)',
                                        color: 'var(--charcoal)'
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                                        style={{ color: 'var(--warm-gray)' }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* City Dropdown */}
                        <div className="w-full lg:w-56">
                            <div className="relative">
                                <select
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border transition-all focus:ring-4 focus:ring-[var(--saffron-glow)] outline-none appearance-none cursor-pointer"
                                    style={{
                                        borderColor: 'var(--sand)',
                                        background: 'var(--cream)',
                                        color: 'var(--charcoal)'
                                    }}
                                >
                                    {availableCities.map(city => (
                                        <option key={city.value} value={city.value}>{city.label}</option>
                                    ))}
                                </select>
                                <svg
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                    style={{ color: 'var(--warm-gray)' }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Feature Toggle Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowPremiumOnly(!showPremiumOnly)}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                                    showPremiumOnly ? 'shadow-lg' : 'hover:shadow-md'
                                }`}
                                style={{
                                    background: showPremiumOnly ? 'var(--gradient-warm)' : 'var(--cream)',
                                    color: showPremiumOnly ? 'white' : 'var(--charcoal)',
                                    border: showPremiumOnly ? 'none' : '1px solid var(--sand)'
                                }}
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Premium
                            </button>
                            <button
                                onClick={() => setShowNewOnly(!showNewOnly)}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                                    showNewOnly ? 'shadow-lg' : 'hover:shadow-md'
                                }`}
                                style={{
                                    background: showNewOnly ? 'var(--gradient-fresh)' : 'var(--cream)',
                                    color: showNewOnly ? 'white' : 'var(--charcoal)',
                                    border: showNewOnly ? 'none' : '1px solid var(--sand)'
                                }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Neu
                            </button>
                        </div>
                    </div>

                    {/* Active Filters & Clear Button */}
                    {hasActiveFilters && (
                        <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-2" style={{ borderColor: 'var(--sand)' }}>
                            <span className="text-sm" style={{ color: 'var(--warm-gray)' }}>Aktive Filter:</span>

                            {searchQuery && (
                                <span
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                                    style={{ background: 'var(--sand)', color: 'var(--charcoal)' }}
                                >
                                    Suche: "{searchQuery}"
                                    <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-[var(--terracotta)]">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            )}

                            {selectedCity !== 'Alle Städte' && (
                                <span
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                                    style={{ background: 'var(--sand)', color: 'var(--charcoal)' }}
                                >
                                    Stadt: {selectedCity}
                                    <button onClick={() => setSelectedCity('Alle Städte')} className="ml-1 hover:text-[var(--terracotta)]">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            )}

                            {showPremiumOnly && (
                                <span
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                                    style={{ background: 'var(--saffron-light)', color: 'var(--charcoal)' }}
                                >
                                    Premium Partner
                                    <button onClick={() => setShowPremiumOnly(false)} className="ml-1 hover:text-[var(--terracotta)]">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            )}

                            {showNewOnly && (
                                <span
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                                    style={{ background: 'var(--mint)', color: 'var(--charcoal)' }}
                                >
                                    Neu (letzte 30 Tage)
                                    <button onClick={() => setShowNewOnly(false)} className="ml-1 hover:text-[var(--terracotta)]">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            )}

                            <button
                                onClick={clearFilters}
                                className="ml-auto text-sm font-semibold transition-colors cursor-pointer hover:underline"
                                style={{ color: 'var(--terracotta)' }}
                            >
                                Alle Filter zurücksetzen
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Markets Grid */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saffron)] border-t-transparent"></div>
                    </div>
                ) : filteredMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredMarkets.map((market, idx) => (
                            <MarketCardWithFavorite
                                key={market.id}
                                market={market}
                                index={idx}
                                variant={market.is_premium ? 'premium' : 'new'}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                            <svg className="w-10 h-10" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                            Keine Märkte gefunden
                        </h2>
                        <p className="text-lg mb-6" style={{ color: 'var(--warm-gray)' }}>
                            {hasActiveFilters
                                ? 'Versuche es mit anderen Filtern oder setze die Filter zurück.'
                                : 'Bald findest du hier unsere Partner-Märkte.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 hover:scale-105 cursor-pointer"
                                style={{ background: 'var(--gradient-warm)', color: 'white' }}
                            >
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}
