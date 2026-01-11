'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchPLZ, type PLZEntry } from '@/lib/plz-data';
import { createClient } from '@/utils/supabase/client';

type SearchMode = 'ort' | 'markte' | 'angebote';

// Market suggestion type
interface MarketSuggestion {
    id: string;
    name: string;
    city: string;
    logo_url: string | null;
}

// Offer suggestion type
interface OfferSuggestion {
    id: string;
    product_name: string;
    description: string | null;
    price: string;
    image_url: string | null;
    market_id: string;
    markets: {
        name: string;
        city: string;
        zip_code: string | null;
    } | null;
}

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
    angebote: {
        placeholder: 'Suche nach Produkten (z.B. Paprika)...',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
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
    const supabase = createClient();

    const [searchMode, setSearchMode] = useState<SearchMode>('ort');
    const [searchValue, setSearchValue] = useState('');

    // PLZ suggestions (for 'ort' mode)
    const [plzSuggestions, setPlzSuggestions] = useState<PLZEntry[]>([]);

    // Market suggestions (for 'markte' mode)
    const [marketSuggestions, setMarketSuggestions] = useState<MarketSuggestion[]>([]);

    // Offer suggestions (for 'angebote' mode)
    const [offerSuggestions, setOfferSuggestions] = useState<OfferSuggestion[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [selectedLocation, setSelectedLocation] = useState<PLZEntry | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const { placeholder, icon } = searchConfig[searchMode];

    // Get current suggestions based on mode
    const getCurrentSuggestions = () => {
        if (searchMode === 'ort') return plzSuggestions;
        if (searchMode === 'markte') return marketSuggestions;
        if (searchMode === 'angebote') return offerSuggestions;
        return [];
    };

    const currentSuggestions = getCurrentSuggestions();

    // Search PLZ/City when typing (only for 'ort' mode)
    useEffect(() => {
        if (searchMode === 'ort' && searchValue.length >= 2) {
            const results = searchPLZ(searchValue, 5);
            setPlzSuggestions(results);
            setShowSuggestions(results.length > 0);
            setSelectedIndex(-1);
        } else if (searchMode === 'ort') {
            setPlzSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchValue, searchMode]);

    // Search Markets when typing (for 'markte' mode)
    useEffect(() => {
        if (searchMode === 'markte' && searchValue.length >= 2) {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(async () => {
                setIsLoading(true);
                try {
                    // Search by name ONLY (city is displayed but not used as search criteria)
                    const { data, error } = await supabase
                        .from('markets')
                        .select('id, name, city, logo_url')
                        .ilike('name', `%${searchValue}%`)
                        .order('is_premium', { ascending: false })
                        .limit(5);

                    if (!error && data) {
                        setMarketSuggestions(data);
                        setShowSuggestions(data.length > 0);
                        setSelectedIndex(-1);
                    }
                } catch (err) {
                    console.error('Error searching markets:', err);
                } finally {
                    setIsLoading(false);
                }
            }, 300);
        } else if (searchMode === 'markte') {
            setMarketSuggestions([]);
            setShowSuggestions(false);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchValue, searchMode, supabase]);

    // Search Offers when typing (for 'angebote' mode)
    useEffect(() => {
        if (searchMode === 'angebote' && searchValue.length >= 2) {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(async () => {
                setIsLoading(true);
                try {
                    // Search by product_name OR description, join with markets for context
                    const { data, error } = await supabase
                        .from('offers')
                        .select('id, product_name, description, price, image_url, market_id, markets(name, city, zip_code)')
                        .or(`product_name.ilike.%${searchValue}%,description.ilike.%${searchValue}%`)
                        .gt('expires_at', new Date().toISOString())
                        .order('created_at', { ascending: false })
                        .limit(5);

                    if (!error && data) {
                        setOfferSuggestions(data as unknown as OfferSuggestion[]);
                        setShowSuggestions(data.length > 0);
                        setSelectedIndex(-1);
                    }
                } catch (err) {
                    console.error('Error searching offers:', err);
                } finally {
                    setIsLoading(false);
                }
            }, 300);
        } else if (searchMode === 'angebote') {
            setOfferSuggestions([]);
            setShowSuggestions(false);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchValue, searchMode, supabase]);

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

    // Handle PLZ selection
    const handleSelectPLZ = useCallback((entry: PLZEntry) => {
        setSearchValue(`${entry.plz} ${entry.city}`);
        setSelectedLocation(entry);
        setShowSuggestions(false);
        setSelectedIndex(-1);
    }, []);

    // Handle Market selection - navigate directly to shop page
    const handleSelectMarket = useCallback((market: MarketSuggestion) => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        router.push(`/shop/${market.id}`);
    }, [router]);

    // Handle Offer selection - navigate to shop page
    const handleSelectOffer = useCallback((offer: OfferSuggestion) => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        router.push(`/shop/${offer.market_id}`);
    }, [router]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || currentSuggestions.length === 0) {
            if (event.key === 'Enter') {
                handleSearch();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setSelectedIndex((prev) =>
                    prev < currentSuggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                event.preventDefault();
                setSelectedIndex((prev) =>
                    prev > 0 ? prev - 1 : currentSuggestions.length - 1
                );
                break;
            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
                    if (searchMode === 'ort') {
                        handleSelectPLZ(plzSuggestions[selectedIndex]);
                    } else if (searchMode === 'markte') {
                        handleSelectMarket(marketSuggestions[selectedIndex]);
                    } else if (searchMode === 'angebote') {
                        handleSelectOffer(offerSuggestions[selectedIndex]);
                    }
                } else {
                    handleSearch();
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    }, [showSuggestions, currentSuggestions, selectedIndex, searchMode, plzSuggestions, marketSuggestions, offerSuggestions, handleSelectPLZ, handleSelectMarket, handleSelectOffer]);

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

    // Render suggestions based on mode
    const renderSuggestions = () => {
        if (searchMode === 'ort') {
            return plzSuggestions.map((entry, index) => (
                <button
                    key={`${entry.plz}-${entry.city}`}
                    onClick={() => handleSelectPLZ(entry)}
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
            ));
        }

        if (searchMode === 'markte') {
            return marketSuggestions.map((market, index) => (
                <button
                    key={market.id}
                    onClick={() => handleSelectMarket(market)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                        w-full px-5 py-4 text-left flex items-center gap-4 transition-colors cursor-pointer
                        ${index === selectedIndex ? 'bg-orange-50' : 'hover:bg-gray-50'}
                    `}
                    style={{ color: 'var(--charcoal)' }}
                    role="option"
                    aria-selected={index === selectedIndex}
                >
                    {/* Market Logo */}
                    <div
                        className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-sm"
                        style={{ border: '1px solid var(--sand)' }}
                    >
                        {market.logo_url ? (
                            <img
                                src={market.logo_url}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                                style={{ background: 'var(--gradient-warm)' }}
                            >
                                {market.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    {/* Market Info */}
                    <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{market.name}</div>
                        <div className="text-sm flex items-center gap-1" style={{ color: 'var(--warm-gray)' }}>
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {market.city}
                        </div>
                    </div>
                    {/* Arrow */}
                    <svg
                        className="w-5 h-5 shrink-0 opacity-50"
                        style={{ color: 'var(--terracotta)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            ));
        }

        if (searchMode === 'angebote') {
            return offerSuggestions.map((offer, index) => (
                <button
                    key={offer.id}
                    onClick={() => handleSelectOffer(offer)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                        w-full px-5 py-4 text-left flex items-center gap-4 transition-colors cursor-pointer
                        ${index === selectedIndex ? 'bg-orange-50' : 'hover:bg-gray-50'}
                    `}
                    style={{ color: 'var(--charcoal)' }}
                    role="option"
                    aria-selected={index === selectedIndex}
                >
                    {/* Product Image */}
                    <div
                        className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm"
                        style={{ border: '1px solid var(--sand)' }}
                    >
                        {offer.image_url ? (
                            <img
                                src={offer.image_url}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ background: 'var(--cream)' }}
                            >
                                <svg className="w-6 h-6" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {/* Offer Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold truncate">{offer.product_name}</span>
                            <span className="text-sm font-black shrink-0" style={{ color: 'var(--terracotta)' }}>
                                {offer.price}
                            </span>
                        </div>
                        <div className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                            bei {offer.markets?.name || 'Unbekannter Markt'} in {offer.markets?.zip_code ? `${offer.markets.zip_code} ` : ''}{offer.markets?.city || ''}
                        </div>
                    </div>
                    {/* Arrow */}
                    <svg
                        className="w-5 h-5 shrink-0 opacity-50"
                        style={{ color: 'var(--terracotta)' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            ));
        }

        return null;
    };

    // Get header text for dropdown
    const getDropdownHeader = () => {
        if (searchMode === 'markte') return 'Märkte';
        if (searchMode === 'angebote') return 'Angebote';
        return null;
    };

    // Get footer hint for dropdown
    const getDropdownFooter = () => {
        if (searchMode === 'markte') return 'Klicke oder drücke Enter um direkt zum Markt zu gehen';
        if (searchMode === 'angebote') return 'Klicke um das Angebot beim Markt anzusehen';
        return null;
    };

    const dropdownHeader = getDropdownHeader();
    const dropdownFooter = getDropdownFooter();

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
                                setPlzSuggestions([]);
                                setMarketSuggestions([]);
                                setOfferSuggestions([]);
                                setShowSuggestions(false);
                                setSelectedLocation(null);
                                setSelectedIndex(-1);
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
                            if (currentSuggestions.length > 0) {
                                setShowSuggestions(true);
                            }
                        }}
                        placeholder={placeholder}
                        className="w-full pl-14 pr-12 py-5 rounded-2xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-orange-200 shadow-2xl transition-all"
                        style={{
                            background: 'white',
                            color: 'var(--charcoal)',
                        }}
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={showSuggestions}
                        aria-haspopup="listbox"
                    />

                    {/* Loading indicator */}
                    {(searchMode === 'markte' || searchMode === 'angebote') && isLoading && (
                        <div className="absolute right-5 top-1/2 -translate-y-1/2">
                            <div
                                className="w-5 h-5 border-2 rounded-full animate-spin"
                                style={{ borderColor: 'var(--sand)', borderTopColor: 'var(--saffron)' }}
                            />
                        </div>
                    )}

                    {/* Suggestions Dropdown - Glass Card Design */}
                    {showSuggestions && currentSuggestions.length > 0 && (
                        <div
                            ref={dropdownRef}
                            className="absolute top-full left-0 right-0 mt-3 rounded-3xl overflow-hidden z-50"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                                backdropFilter: 'blur(24px)',
                                WebkitBackdropFilter: 'blur(24px)',
                                border: '1px solid rgba(255, 255, 255, 0.6)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                            }}
                            role="listbox"
                        >
                            {/* Header */}
                            {dropdownHeader && (
                                <div
                                    className="px-5 py-3 text-xs font-bold uppercase tracking-wider border-b flex items-center gap-2"
                                    style={{
                                        color: 'var(--warm-gray)',
                                        borderColor: 'rgba(0, 0, 0, 0.06)',
                                        background: 'rgba(255, 255, 255, 0.5)'
                                    }}
                                >
                                    <svg className="w-4 h-4" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    {dropdownHeader}
                                </div>
                            )}
                            {renderSuggestions()}

                            {/* Footer hint */}
                            {dropdownFooter && (
                                <div
                                    className="px-5 py-3 text-xs border-t flex items-center gap-2"
                                    style={{
                                        color: 'var(--warm-gray)',
                                        borderColor: 'rgba(0, 0, 0, 0.06)',
                                        background: 'rgba(255, 255, 255, 0.5)'
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {dropdownFooter}
                                </div>
                            )}
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
