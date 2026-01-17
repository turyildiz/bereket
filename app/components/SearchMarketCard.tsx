'use client';

import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';

interface MarketType {
    id: string;
    name: string;
    city: string;
    zip_code: string | null;
    logo_url: string | null;
    header_url: string | null;
    about_text: string | null;
    is_premium: boolean;
}

interface SearchMarketCardProps {
    market: MarketType;
    index: number;
}

/**
 * Heart Icon SVG Component
 */
function HeartIcon({ filled }: { filled: boolean }) {
    if (filled) {
        return (
            <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="#E18B55"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        );
    }
    return (
        <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E18B55"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    );
}

/**
 * Search page Market Card with favorites functionality
 */
export default function SearchMarketCard({ market, index }: SearchMarketCardProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const isFav = isFavorite(market.id);

    const handleHeartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(market.id);
    };

    return (
        <Link
            href={`/shop/${market.id}`}
            className="group relative rounded-3xl overflow-hidden cursor-pointer block transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 animate-scale-in"
            style={{
                background: 'white',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                animationDelay: `${index * 0.05}s`,
            }}
        >
            {/* Premium Badge - TOP LEFT */}
            {market.is_premium && (
                <div
                    className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1"
                    style={{ background: 'var(--saffron)', color: 'white' }}
                >
                    ⭐ Premium
                </div>
            )}

            {/* Image */}
            <div className="relative aspect-[16/10] overflow-hidden">
                <img
                    src={
                        market.header_url ||
                        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=600'
                    }
                    alt={market.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Heart Toggle - TOP RIGHT */}
                <button
                    onClick={handleHeartClick}
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
                    style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
                    }}
                    aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                >
                    <HeartIcon filled={isFav} />
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div
                        className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-lg -mt-10 relative z-10"
                        style={{ background: 'white', border: '3px solid white' }}
                    >
                        {market.logo_url ? (
                            <img src={market.logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-xl font-black text-white"
                                style={{ background: 'var(--gradient-warm)' }}
                            >
                                {market.name.charAt(0)}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3
                            className="font-bold text-lg group-hover:text-[var(--terracotta)] transition-colors duration-300 truncate"
                            style={{ color: 'var(--charcoal)' }}
                        >
                            {market.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--warm-gray)' }}>
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                            </svg>
                            <span className="truncate">
                                {market.zip_code} {market.city}
                            </span>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0"
                        style={{ background: 'var(--mint)' }}
                    >
                        <svg
                            className="w-5 h-5"
                            style={{ color: 'var(--cardamom)' }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
