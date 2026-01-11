'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchPLZ, type PLZEntry } from '@/lib/plz-data';

type SearchMode = 'ort' | 'markte' | 'angebote';

const searchConfig: Record<SearchMode, { placeholder: string; icon: React.ReactNode }> = {
    ort: {
        placeholder: 'Deine Stadt oder Postleitzahl...',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    markte: {
        placeholder: 'Suche nach einem Supermarkt...',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
    angebote: {
        placeholder: 'Suche nach Produkten (z.B. Paprika)...',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
};

const tabs: { id: SearchMode; label: string }[] = [
    { id: 'ort', label: 'Ort' },
    { id: 'markte', label: 'Märkte' },
    { id: 'angebote', label: 'Angebote' },
];

export default function HeroSearchBar() {
    const router = useRouter();
    const [searchMode, setSearchMode] = useState<SearchMode>('ort');
    const [searchValue, setSearchValue] = useState('');
    const [suggestions, setSuggestions] = useState<PLZEntry[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [selectedLocation, setSelectedLocation] = useState<PLZEntry | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { placeholder, icon } = searchConfig[searchMode];

    // Search PLZ/City when typing (only for 'ort' mode)
    useEffect(() => {
        if (searchMode === 'ort' && searchValue.length >= 2) {
            const results = searchPLZ(searchValue, 5);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setSelectedIndex(-1);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchValue, searchMode]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle selection
    const handleSelect = useCallback((entry: PLZEntry) => {
        setSearchValue(`${entry.plz} ${entry.city}`);
        setSelectedLocation(entry);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (event.key === 'Enter') {
                handleSearch();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setSelectedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                event.preventDefault();
                setSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                    handleSelect(suggestions[selectedIndex]);
                } else {
                    handleSearch();
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    }, [showSuggestions, suggestions, selectedIndex, handleSelect]);

    // Handle search submission
    const handleSearch = () => {
        if (searchMode === 'ort') {
            if (selectedLocation) {
                router.push(`/search?city=${encodeURIComponent(selectedLocation.city)}&plz=${selectedLocation.plz}`);
            } else if (searchValue.trim()) {
                // Try to parse the input
                const match = searchValue.match(/^(\d{5})?\s*(.+)?$/);
                if (match) {
                    const plz = match[1] || '';
                    const city = match[2]?.trim() || '';
                    const params = new URLSearchParams();
                    if (city) params.set('city', city);
                    if (plz) params.set('plz', plz);
                    if (params.toString()) {
                        router.push(`/search?${params.toString()}`);
                    }
                }
            }
        } else if (searchMode === 'markte' && searchValue.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchValue)}&type=markets`);
        } else if (searchMode === 'angebote' && searchValue.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchValue)}&type=offers`);
        }
    };

    // Clear selected location when typing new value
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
        setSelectedLocation(null);
    };

    return (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {/* Tabs */}
            <div className="flex justify-center sm:justify-start mb-4">
                <div
                    className="inline-flex items-center gap-1 p-1.5 rounded-2xl"
                    style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)' }}
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setSearchMode(tab.id);
                                setSearchValue('');
                                setSuggestions([]);
                                setShowSuggestions(false);
                                setSelectedLocation(null);
                            }}
                            className={`
                px-5 py-3 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer
                min-h-[44px] min-w-[80px]
                ${searchMode === tab.id
                                    ? 'text-white shadow-lg'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                }
              `}
                            style={searchMode === tab.id ? { background: 'var(--gradient-warm)' } : {}}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Input */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10" style={{ color: 'var(--warm-gray)' }}>
                        {icon}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (searchMode === 'ort' && suggestions.length > 0) {
                                setShowSuggestions(true);
                            }
                        }}
                        placeholder={placeholder}
                        className="w-full pl-14 pr-6 py-5 rounded-2xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-orange-200 shadow-2xl transition-all"
                        style={{
                            background: 'white',
                            color: 'var(--charcoal)',
                        }}
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={showSuggestions}
                        aria-haspopup="listbox"
                    />

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div
                            ref={dropdownRef}
                            className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-50"
                            style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid var(--sand)',
                            }}
                            role="listbox"
                        >
                            {suggestions.map((entry, index) => (
                                <button
                                    key={`${entry.plz}-${entry.city}`}
                                    onClick={() => handleSelect(entry)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`
                    w-full px-5 py-4 text-left flex items-center gap-3 transition-colors cursor-pointer
                    ${index === selectedIndex ? 'bg-orange-50' : 'hover:bg-gray-50'}
                  `}
                                    style={{ color: 'var(--charcoal)' }}
                                    role="option"
                                    aria-selected={index === selectedIndex}
                                >
                                    <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div>
                                        <span className="font-bold">{entry.plz}</span>
                                        <span className="mx-2 text-gray-400">•</span>
                                        <span>{entry.city}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSearch}
                    className="btn-primary px-10 py-5 font-bold rounded-2xl text-lg shadow-2xl flex items-center justify-center gap-3 whitespace-nowrap cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Deals finden
                </button>
            </div>
        </div>
    );
}
