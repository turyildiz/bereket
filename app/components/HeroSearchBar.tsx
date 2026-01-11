'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchPLZ, type PLZEntry } from '@/lib/plz-data';

export default function HeroSearchBar() {
    const router = useRouter();

    // Two simple fields
    const [searchQuery, setSearchQuery] = useState(''); // What are you looking for?
    const [locationQuery, setLocationQuery] = useState(''); // Where?

    // Location suggestions
    const [locationSuggestions, setLocationSuggestions] = useState<PLZEntry[]>([]);
    const [selectedLocation, setSelectedLocation] = useState<PLZEntry | null>(null);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const locationInputRef = useRef<HTMLInputElement>(null);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Search for locations when typing in "Wo?" field
    useEffect(() => {
        if (locationQuery.length >= 2 && !selectedLocation) {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                setIsLoading(true);
                const results = searchPLZ(locationQuery);
                setLocationSuggestions(results.slice(0, 5));
                setShowLocationDropdown(results.length > 0);
                setIsLoading(false);
            }, 150);
        } else {
            setLocationSuggestions([]);
            setShowLocationDropdown(false);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [locationQuery, selectedLocation]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                locationDropdownRef.current &&
                !locationDropdownRef.current.contains(event.target as Node) &&
                locationInputRef.current &&
                !locationInputRef.current.contains(event.target as Node)
            ) {
                setShowLocationDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle location selection
    const handleSelectLocation = useCallback((entry: PLZEntry) => {
        setLocationQuery(`${entry.plz} ${entry.city}`);
        setSelectedLocation(entry);
        setShowLocationDropdown(false);
    }, []);

    // Clear location
    const handleClearLocation = () => {
        setLocationQuery('');
        setSelectedLocation(null);
        locationInputRef.current?.focus();
    };

    // Handle location input change
    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocationQuery(e.target.value);
        setSelectedLocation(null); // Clear selection when typing
    };

    // Handle search submission
    const handleSearch = () => {
        const params = new URLSearchParams();

        // Add search query if provided
        if (searchQuery.trim()) {
            params.set('q', searchQuery.trim());
        }

        // Add location if selected or typed
        if (selectedLocation) {
            params.set('city', selectedLocation.city);
            params.set('plz', selectedLocation.plz);
        } else if (locationQuery.trim()) {
            // Try to parse typed location
            const match = locationQuery.match(/^(\d{5})?\s*(.+)?$/);
            if (match) {
                if (match[1]) params.set('plz', match[1]);
                if (match[2]?.trim()) params.set('city', match[2].trim());
            }
        }

        // Navigate to search page
        if (params.toString()) {
            router.push(`/search?${params.toString()}`);
        }
    };

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {/* Search Container - Glass Card */}
            <div
                className="rounded-3xl p-2 sm:p-3 shadow-2xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
            >
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* Field 1: What are you looking for? */}
                    <div className="flex-1 relative">
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--terracotta)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Shops oder Produkte suchen..."
                                className="w-full pl-12 pr-4 py-4 rounded-2xl text-base font-medium transition-all duration-300 focus:outline-none focus:ring-2"
                                style={{
                                    background: 'var(--cream)',
                                    color: 'var(--charcoal)',
                                    border: '2px solid transparent',
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--saffron)'}
                                onBlur={(e) => e.target.style.borderColor = 'transparent'}
                            />
                        </div>
                    </div>

                    {/* Divider (desktop) */}
                    <div className="hidden sm:block w-px self-stretch my-2" style={{ background: 'var(--sand)' }} />

                    {/* Field 2: Where? (Location) */}
                    <div className="flex-1 relative">
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--cardamom)' }}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <input
                                ref={locationInputRef}
                                type="text"
                                value={locationQuery}
                                onChange={handleLocationChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => locationSuggestions.length > 0 && setShowLocationDropdown(true)}
                                placeholder="PLZ oder Stadt..."
                                className="w-full pl-12 pr-10 py-4 rounded-2xl text-base font-medium transition-all duration-300 focus:outline-none focus:ring-2"
                                style={{
                                    background: 'var(--cream)',
                                    color: 'var(--charcoal)',
                                    border: '2px solid transparent',
                                }}
                            />
                            {/* Clear button */}
                            {locationQuery && (
                                <button
                                    onClick={handleClearLocation}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200"
                                    style={{ color: 'var(--warm-gray)' }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div
                                        className="w-5 h-5 border-2 rounded-full animate-spin"
                                        style={{ borderColor: 'var(--sand)', borderTopColor: 'var(--saffron)' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Location Suggestions Dropdown */}
                        {showLocationDropdown && locationSuggestions.length > 0 && (
                            <div
                                ref={locationDropdownRef}
                                className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-50"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.98)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid var(--sand)',
                                }}
                            >
                                {locationSuggestions.map((entry) => (
                                    <button
                                        key={`${entry.plz}-${entry.city}`}
                                        onClick={() => handleSelectLocation(entry)}
                                        className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors hover:bg-orange-50 cursor-pointer"
                                        style={{ color: 'var(--charcoal)' }}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="font-bold">{entry.plz}</div>
                                            <div className="text-sm" style={{ color: 'var(--warm-gray)' }}>{entry.city}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        className="px-8 py-4 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        style={{
                            background: 'var(--gradient-warm)',
                            minWidth: '140px',
                        }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Suchen</span>
                    </button>
                </div>
            </div>

            {/* Helper Text */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Suche nach Shops wie "Yildiz Market" oder Produkten wie "Baklava"
                </span>
            </div>
        </div>
    );
}
