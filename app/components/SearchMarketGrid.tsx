'use client';

import SearchMarketCard from './SearchMarketCard';

interface MarketType {
    id: string;
    slug: string;
    name: string;
    city: string;
    zip_code: string | null;
    logo_url: string | null;
    header_url: string | null;
    about_text: string | null;
    is_premium: boolean;
}

interface SearchMarketGridProps {
    markets: MarketType[];
}

/**
 * Client-side wrapper for rendering search market cards with favorites functionality
 */
export default function SearchMarketGrid({ markets }: SearchMarketGridProps) {
    return (
        <>
            {markets.map((market, idx) => (
                <SearchMarketCard key={market.id} market={market} index={idx} />
            ))}
        </>
    );
}
