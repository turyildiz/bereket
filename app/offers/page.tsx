'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';

interface Offer {
    id: string;
    product_name: string;
    price: string;
    image_library: {
        url: string;
    } | null;
    expires_at: string;
    market_id: string;
    created_at: string;
    ai_category: string | null;
    markets: {
        id: string;
        slug: string;
        name: string;
        city: string;
        zip_code: string | null;
        logo_url: string | null;
    } | null;
}

// Category definitions with icons
const CATEGORIES = [
    { id: 'all', label: 'Alle', icon: '🛒' },
    { id: 'Obst & Gemüse', label: 'Obst & Gemüse', icon: '🥬' },
    { id: 'Fleisch & Wurst', label: 'Fleisch & Wurst', icon: '🥩' },
    { id: 'Milchprodukte', label: 'Milchprodukte', icon: '🧀' },
    { id: 'Backwaren', label: 'Backwaren', icon: '🥖' },
    { id: 'Getränke', label: 'Getränke', icon: '🥤' },
    { id: 'Sonstiges', label: 'Sonstiges', icon: '📦' },
];

const INITIAL_LOAD = 50; // Load more initially for client-side filtering

function OffersPageContent() {
    const searchParams = useSearchParams();
    const showFavoritesOnly = searchParams.get('favorites') === 'true';

    const { favorites, isLoaded, hasFavorites } = useFavorites();
    const [allOffers, setAllOffers] = useState<Offer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterMode, setFilterMode] = useState<'all' | 'favorites'>(showFavoritesOnly ? 'favorites' : 'all');

    // New filter states
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedCity, setSelectedCity] = useState<string>('Alle Städte');

    // Category scroll refs
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
    }, [allOffers]);

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

    // Initial load - fetch all offers once for client-side filtering
    useEffect(() => {
        if (!isLoaded) return;

        const fetchAllOffers = async () => {
            setIsLoading(true);
            const supabase = createClient();

            let query = supabase
                .from('offers')
                .select('id, product_name, price, expires_at, market_id, created_at, ai_category, image_library(url), markets!inner(id, slug, name, city, zip_code, logo_url)')
                .eq('markets.is_active', true)
                .eq('status', 'live')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(500); // Get all offers for filtering

            // Filter by favorites if applicable
            if (filterMode === 'favorites' && hasFavorites && favorites.length > 0) {
                query = query.in('market_id', favorites);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching offers:', error);
                setAllOffers([]);
            } else {
                setAllOffers((data as unknown as Offer[]) || []);
            }
            setIsLoading(false);
        };

        fetchAllOffers();
    }, [isLoaded, favorites, hasFavorites, filterMode]);

    // Get unique cities from offers for dropdown
    const availableCities = useMemo(() => {
        const cityZipMap = new Map<string, string>();
        allOffers.forEach(offer => {
            const city = offer.markets?.city;
            const zip = offer.markets?.zip_code;
            if (city && !cityZipMap.has(city) && zip) {
                cityZipMap.set(city, zip);
            }
        });

        const sortedCities = Array.from(cityZipMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([city, zip]) => ({ label: `${zip} ${city}`, value: city }));

        return [{ label: 'Alle Städte', value: 'Alle Städte' }, ...sortedCities];
    }, [allOffers]);

    // Client-side filtering
    const filteredOffers = useMemo(() => {
        let result = [...allOffers];

        // Filter by category
        if (selectedCategory !== 'all') {
            result = result.filter(offer => offer.ai_category === selectedCategory);
        }

        // Filter by city
        if (selectedCity !== 'Alle Städte') {
            result = result.filter(offer => offer.markets?.city === selectedCity);
        }

        return result;
    }, [allOffers, selectedCategory, selectedCity]);

    // Get category count for display
    const getCategoryCount = (categoryId: string): number => {
        if (categoryId === 'all') {
            // When showing "all", still respect city filter
            if (selectedCity !== 'Alle Städte') {
                return allOffers.filter(o => o.markets?.city === selectedCity).length;
            }
            return allOffers.length;
        }
        // For specific category, respect city filter
        if (selectedCity !== 'Alle Städte') {
            return allOffers.filter(o => o.ai_category === categoryId && o.markets?.city === selectedCity).length;
        }
        return allOffers.filter(o => o.ai_category === categoryId).length;
    };

    // Check if any filters are active
    const hasActiveFilters = selectedCategory !== 'all' || selectedCity !== 'Alle Städte';

    // Clear filters
    const clearFilters = () => {
        setSelectedCategory('all');
        setSelectedCity('Alle Städte');
    };

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
                                {/* Dynamic Badge */}
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
                                        {isLoading ? 'Laden...' : `${filteredOffers.length} Angebot${filteredOffers.length !== 1 ? 'e' : ''}`}
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

            {/* Filter Bar - Premium Design */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                <div
                    className="relative rounded-3xl shadow-2xl animate-fade-in-up overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.5)',
                    }}
                >
                    {/* Decorative gradient background */}
                    <div
                        className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at 30% 50%, var(--terracotta) 0%, transparent 60%), radial-gradient(circle at 80% 80%, var(--saffron) 0%, transparent 50%)'
                        }}
                    />

                    <div className="relative p-6 sm:p-8">
                        {/* Header */}
                        <div className="mb-6 pb-4 border-b" style={{ borderColor: 'var(--sand)' }}>
                            <h2
                                className="text-2xl font-black mb-1"
                                style={{
                                    fontFamily: 'var(--font-playfair)',
                                    color: 'var(--charcoal)',
                                    background: 'var(--gradient-warm)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                            >
                                Angebote filtern
                            </h2>
                            <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                Finde genau das, was du suchst
                            </p>
                        </div>

                        <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">
                            {/* City Selector - Left Column */}
                            <div className="space-y-2">
                                <label
                                    className="flex items-center gap-2 text-sm font-bold mb-3"
                                    style={{ color: 'var(--charcoal)' }}
                                >
                                    <svg className="w-4 h-4" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>Standort wählen</span>
                                </label>
                                <div className="relative group">
                                    <select
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl border-2 font-semibold text-base transition-all duration-300 focus:ring-4 focus:scale-[1.02] outline-none appearance-none cursor-pointer shadow-md hover:shadow-xl"
                                        style={{
                                            borderColor: selectedCity === 'Alle Städte' ? 'var(--sand)' : 'var(--terracotta)',
                                            background: selectedCity === 'Alle Städte' ? 'white' : 'linear-gradient(135deg, #fff 0%, #FFF8F0 100%)',
                                            color: 'var(--charcoal)',
                                            boxShadow: selectedCity === 'Alle Städte'
                                                ? '0 4px 15px rgba(0,0,0,0.05)'
                                                : '0 4px 20px rgba(225, 139, 85, 0.15)'
                                        }}
                                    >
                                        {availableCities.map(city => (
                                            <option key={city.value} value={city.value}>{city.label}</option>
                                        ))}
                                    </select>
                                    <div
                                        className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:scale-110"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            style={{ color: selectedCity === 'Alle Städte' ? 'var(--warm-gray)' : 'var(--terracotta)' }}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {selectedCity !== 'Alle Städte' && (
                                    <button
                                        onClick={() => setSelectedCity('Alle Städte')}
                                        className="mt-2 text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer"
                                        style={{ color: 'var(--terracotta)' }}
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Stadt zurücksetzen
                                    </button>
                                )}
                            </div>

                            {/* Category Bar - Right Column */}
                            <div className="relative">
                                <label
                                    className="flex items-center gap-2 text-sm font-bold mb-3"
                                    style={{ color: 'var(--charcoal)' }}
                                >
                                    <svg className="w-4 h-4" style={{ color: 'var(--saffron)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <span>Kategorie auswählen</span>
                                </label>

                                {/* Left scroll button */}
                                {showScrollButtons && (
                                    <button
                                        onClick={() => scrollCategories('left')}
                                        className="hidden lg:flex absolute left-0 top-[calc(50%+6px)] -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-110 cursor-pointer"
                                        style={{
                                            marginLeft: '-12px',
                                            background: 'white',
                                            border: '2px solid var(--sand)'
                                        }}
                                        aria-label="Scroll left"
                                    >
                                        <svg className="w-5 h-5" style={{ color: 'var(--charcoal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                )}

                                <div
                                    ref={categoryScrollRef}
                                    className={`flex gap-3 pb-2 overflow-x-auto ${showScrollButtons ? 'lg:mx-6' : ''}`}
                                    style={{
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                        WebkitOverflowScrolling: 'touch'
                                    }}
                                >
                                    {CATEGORIES.filter((category) => {
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
                                                    group relative flex items-center gap-2.5 px-5 py-3.5 rounded-2xl font-bold text-sm
                                                    whitespace-nowrap transition-all duration-300 flex-shrink-0 cursor-pointer
                                                    ${isActive
                                                        ? 'shadow-xl scale-105'
                                                        : 'hover:scale-105 hover:shadow-lg'
                                                    }
                                                `}
                                                style={{
                                                    background: isActive
                                                        ? 'var(--gradient-warm)'
                                                        : 'white',
                                                    color: isActive ? 'white' : 'var(--charcoal)',
                                                    border: isActive
                                                        ? 'none'
                                                        : '2px solid var(--sand)',
                                                    boxShadow: isActive
                                                        ? '0 8px 25px rgba(225, 139, 85, 0.25)'
                                                        : '0 4px 15px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <span className={`text-xl transition-transform ${isActive ? '' : 'group-hover:scale-110'}`}>
                                                    {category.icon}
                                                </span>
                                                <span>{category.label}</span>
                                                <span
                                                    className="ml-1 min-w-[24px] h-6 px-2 flex items-center justify-center rounded-lg text-xs font-black"
                                                    style={{
                                                        background: isActive
                                                            ? 'rgba(255, 255, 255, 0.3)'
                                                            : 'var(--saffron-light)',
                                                        color: isActive ? 'white' : 'var(--charcoal)'
                                                    }}
                                                >
                                                    {count}
                                                </span>
                                                {isActive && (
                                                    <div
                                                        className="absolute inset-0 rounded-2xl opacity-50 blur-xl"
                                                        style={{ background: 'var(--gradient-warm)' }}
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Right scroll button */}
                                {showScrollButtons && (
                                    <button
                                        onClick={() => scrollCategories('right')}
                                        className="hidden lg:flex absolute right-0 top-[calc(50%+6px)] -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-110 cursor-pointer"
                                        style={{
                                            marginRight: '-12px',
                                            background: 'white',
                                            border: '2px solid var(--sand)'
                                        }}
                                        aria-label="Scroll right"
                                    >
                                        <svg className="w-5 h-5" style={{ color: 'var(--charcoal)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Active Filters & Clear Button */}
                        {hasActiveFilters && (
                            <div className="mt-6 pt-6 border-t flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--sand)' }}>
                                <span className="text-sm font-semibold" style={{ color: 'var(--warm-gray)' }}>
                                    🎯 Aktive Filter:
                                </span>

                                {selectedCity !== 'Alle Städte' && (
                                    <span
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all group cursor-pointer"
                                        style={{ background: 'white', border: '2px solid var(--terracotta)', color: 'var(--charcoal)' }}
                                    >
                                        <span style={{ color: 'var(--terracotta)' }}>📍</span>
                                        {selectedCity}
                                        <button
                                            onClick={() => setSelectedCity('Alle Städte')}
                                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                            style={{ background: 'var(--terracotta)' }}
                                        >
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                )}

                                {selectedCategory !== 'all' && (
                                    <span
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all group cursor-pointer"
                                        style={{ background: 'white', border: '2px solid var(--saffron)', color: 'var(--charcoal)' }}
                                    >
                                        <span className="text-base">{CATEGORIES.find(c => c.id === selectedCategory)?.icon}</span>
                                        {selectedCategory}
                                        <button
                                            onClick={() => setSelectedCategory('all')}
                                            className="ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                            style={{ background: 'var(--saffron)' }}
                                        >
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </span>
                                )}

                                <button
                                    onClick={clearFilters}
                                    className="ml-auto px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg cursor-pointer"
                                    style={{
                                        background: 'var(--gradient-warm)',
                                        color: 'white'
                                    }}
                                >
                                    ✨ Alle Filter zurücksetzen
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Offers Grid */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
                {!isLoaded || isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saffron)] border-t-transparent"></div>
                    </div>
                ) : filteredOffers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredOffers.map((offer, idx) => {
                            const marketData = offer.markets;
                            const marketName = marketData?.name || 'Lokaler Markt';
                            const marketLogo = marketData?.logo_url;
                            const marketLocation = marketData?.zip_code && marketData?.city
                                ? `${marketData.zip_code} ${marketData.city}`
                                : marketData?.city || '';
                            const expiresDate = new Date(offer.expires_at);
                            const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                            return (
                                <Link
                                    href={marketData ? `/shop/${marketData.slug}` : '#'}
                                    key={offer.id}
                                    className="group relative rounded-3xl overflow-hidden cursor-pointer hover-lift animate-scale-in block"
                                    style={{
                                        background: 'white',
                                        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
                                        animationDelay: `${Math.min(idx, 17) * 0.03}s`
                                    }}
                                >
                                    {/* Image */}
                                    <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#f8f5f0' }}>
                                        <img
                                            src={offer.image_library?.url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600'}
                                            alt={offer.product_name}
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
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
                                        {/* Market Logo Badge - Top Left */}
                                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg" style={{ background: 'white' }}>
                                            {marketLogo ? (
                                                <img src={marketLogo} alt={marketName} className="w-6 h-6 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--gradient-warm)' }}>
                                                    {marketName.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-xs font-bold" style={{ color: 'var(--charcoal)' }}>{marketName}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3
                                            className="font-bold text-lg mb-1"
                                            style={{
                                                fontFamily: 'var(--font-playfair)',
                                                color: 'var(--charcoal)'
                                            }}
                                        >
                                            {offer.product_name}
                                        </h3>

                                        <p className="text-xs mb-3" style={{ color: 'var(--warm-gray)' }}>
                                            Gültig bis {expiresDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </p>

                                        <div
                                            className="flex items-center justify-between pt-3 border-t"
                                            style={{ borderColor: 'var(--sand)' }}
                                        >
                                            <span
                                                className="text-2xl font-black"
                                                style={{ color: 'var(--terracotta)' }}
                                            >
                                                {offer.price}
                                            </span>

                                            {/* Market Location */}
                                            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--warm-gray)' }}>
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="font-medium">{marketLocation}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                            <span className="text-4xl">🧘</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                            Keine Angebote gefunden
                        </h2>
                        <p className="text-lg mb-6" style={{ color: 'var(--warm-gray)' }}>
                            {hasActiveFilters
                                ? 'Keine Angebote in dieser Kategorie in deiner Stadt gefunden. Shanti shanti!'
                                : filterMode === 'favorites'
                                    ? 'Deine Lieblingsmärkte haben aktuell keine aktiven Angebote.'
                                    : 'Aktuell sind keine Angebote verfügbar. Schau bald wieder vorbei!'}
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
                        {filterMode === 'favorites' && !hasActiveFilters && (
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
