'use client';

import MarketCardWithFavorite from './MarketCardWithFavorite';

interface Market {
    id: string;
    name: string;
    city: string;
    header_url: string | null;
    logo_url: string | null;
    about_text: string | null;
    is_premium?: boolean;
    zip_code?: string | null;
    location?: string | null;
}

interface MarketGridClientProps {
    markets: Market[];
    variant?: 'premium' | 'new' | 'search';
}

/**
 * Client-side wrapper for rendering market cards with favorites functionality.
 * Used by server components to delegate the client-side favorite logic.
 */
export default function MarketGridClient({ markets, variant = 'premium' }: MarketGridClientProps) {
    return (
        <>
            {markets.map((market, idx) => (
                <MarketCardWithFavorite
                    key={market.id}
                    market={market}
                    index={idx}
                    variant={variant}
                />
            ))}
        </>
    );
}
