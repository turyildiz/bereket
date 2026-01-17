'use client';

import Link from 'next/link';
import { useFavorites } from '@/hooks/useFavorites';

interface MarketCardWithFavoriteProps {
    market: {
        id: string;
        slug: string;
        name: string;
        city: string;
        header_url?: string | null;
        logo_url?: string | null;
        about_text?: string | null;
        is_premium?: boolean;
        zip_code?: string | null;
    };
    index?: number;
    variant?: 'premium' | 'new' | 'search';
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

export default function MarketCardWithFavorite({
    market,
    index = 0,
    variant = 'premium',
}: MarketCardWithFavoriteProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const isFav = isFavorite(market.id);

    // Truncate about_text
    const teaser = market.about_text
        ? market.about_text.length > 80
            ? market.about_text.substring(0, 80).trim() + '...'
            : market.about_text
        : `Entdecken Sie ${market.name} – Ihr ${variant === 'premium' ? 'Premium-' : ''}Markt für frische Spezialitäten.`;

    const handleHeartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(market.id);
    };

    // Determine badge styling based on variant
    const showPremiumBadge = market.is_premium;
    const showNewBadge = !market.is_premium && variant === 'new';

    return (
        <Link
            href={`/shop/${market.slug}`}
            className="group relative rounded-3xl overflow-hidden cursor-pointer block animate-scale-in transition-transform duration-300 hover:scale-[1.03]"
            style={{
                animationDelay: `${index * 0.1}s`,
                background: 'white',
                boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
            }}
        >
            {/* Image Section */}
            <div className="relative aspect-[4/3] overflow-hidden">
                <img
                    src={
                        market.header_url ||
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'
                    }
                    alt={market.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />

                {/* Badges moved to TOP LEFT */}
                {showPremiumBadge && (
                    <div className="absolute top-4 left-4 badge-premium cursor-default shadow-lg z-10">
                        <svg
                            className="w-3 h-3 inline-block mr-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Premium Partner
                    </div>
                )}
                {showNewBadge && (
                    <div className="absolute top-4 left-4 badge-new cursor-default shadow-lg z-10">
                        <svg
                            className="w-3 h-3 inline-block mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                        </svg>
                        Neu
                    </div>
                )}

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

            {/* Content Section with Overlapping Logo */}
            <div className="relative p-6 pt-10">
                {/* Overlapping Logo */}
                <div
                    className="absolute -top-8 left-6 w-[60px] h-[60px] rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-white"
                    style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)' }}
                >
                    {market.logo_url ? (
                        <img
                            src={market.logo_url}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-xl font-bold text-white"
                            style={{
                                background:
                                    variant === 'new'
                                        ? 'var(--gradient-fresh)'
                                        : 'var(--gradient-warm)',
                            }}
                        >
                            {market.name.charAt(0)}
                        </div>
                    )}
                </div>

                {/* Market Name */}
                <h3
                    className="font-bold text-xl mb-2 truncate"
                    style={{
                        fontFamily: 'var(--font-playfair)',
                        color: 'var(--charcoal)',
                    }}
                >
                    {market.name}
                </h3>

                {/* Teaser Text */}
                <p
                    className="text-sm mb-4 line-clamp-2"
                    style={{ color: 'var(--warm-gray)' }}
                >
                    {teaser}
                </p>

                {/* City with MapPin */}
                <div
                    className="flex items-center justify-between pt-4 border-t"
                    style={{ borderColor: 'var(--sand)' }}
                >
                    <div
                        className="flex items-center gap-1.5 text-sm font-medium"
                        style={{ color: 'var(--warm-gray)' }}
                    >
                        <svg
                            className="w-4 h-4 shrink-0"
                            style={{
                                color:
                                    variant === 'new'
                                        ? 'var(--cardamom)'
                                        : 'var(--terracotta)',
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                        {market.zip_code ? `${market.zip_code} ` : ''}
                        {market.city}
                    </div>

                    {/* Arrow indicator */}
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        style={{
                            background:
                                variant === 'new' ? 'var(--mint)' : 'var(--cream)',
                        }}
                    >
                        <svg
                            className="w-4 h-4"
                            style={{
                                color:
                                    variant === 'new'
                                        ? 'var(--cardamom)'
                                        : 'var(--terracotta)',
                            }}
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
