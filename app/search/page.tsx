import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

interface SearchPageProps {
    searchParams: Promise<{
        city?: string;
        plz?: string;
        q?: string;
        type?: string;
    }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams;
    const { city, plz, q, type } = params;

    const supabase = await createClient();

    // Build query based on search type
    let markets: { id: string; name: string; city: string; zip_code: string | null; location: string; logo_url: string | null; header_url: string | null; about_text: string | null; is_premium: boolean }[] = [];
    let offers: { id: string; product_name: string; price: string; image_url: string | null; market_id: string; markets: { name: string; city: string } | null }[] = [];

    // Location-based search
    if (city || plz) {
        let query = supabase
            .from('markets')
            .select('id, name, city, zip_code, location, logo_url, header_url, about_text, is_premium');

        if (plz) {
            query = query.eq('zip_code', plz);
        } else if (city) {
            query = query.ilike('city', `%${city}%`);
        }

        const { data } = await query.order('is_premium', { ascending: false }).limit(20);
        markets = data || [];
    }

    // Market name search
    if (type === 'markets' && q) {
        const { data } = await supabase
            .from('markets')
            .select('id, name, city, zip_code, location, logo_url, header_url, about_text, is_premium')
            .ilike('name', `%${q}%`)
            .order('is_premium', { ascending: false })
            .limit(20);
        markets = data || [];
    }

    // Offers/product search
    if (type === 'offers' && q) {
        const { data } = await supabase
            .from('offers')
            .select('id, product_name, price, image_url, market_id, markets(name, city)')
            .ilike('product_name', `%${q}%`)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(20);
        offers = (data as unknown as typeof offers) || [];
    }

    // Build search description
    const getSearchDescription = () => {
        if (city && plz) return `${plz} ${city}`;
        if (city) return city;
        if (plz) return plz;
        if (q) return q;
        return '';
    };

    const searchDescription = getSearchDescription();
    const hasResults = markets.length > 0 || offers.length > 0;

    return (
        <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
            {/* Header */}
            <div className="relative py-16 sm:py-20 overflow-hidden" style={{ background: 'var(--gradient-night)' }}>
                <div className="absolute inset-0 dot-pattern" style={{ opacity: 0.05 }}></div>
                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Zurück zur Startseite
                    </Link>

                    <h1
                        className="text-4xl sm:text-5xl font-black text-white mb-4"
                        style={{ fontFamily: 'var(--font-playfair)' }}
                    >
                        Suchergebnisse
                    </h1>

                    {searchDescription && (
                        <p className="text-xl text-white/80">
                            {type === 'offers' ? 'Angebote für' : type === 'markets' ? 'Märkte für' : 'Märkte in'}{' '}
                            <span className="font-bold text-white">&quot;{searchDescription}&quot;</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                {!hasResults ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                            <svg className="w-10 h-10" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h2
                            className="text-2xl font-bold mb-4"
                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                        >
                            Keine Ergebnisse gefunden
                        </h2>
                        <p className="text-lg mb-8" style={{ color: 'var(--warm-gray)' }}>
                            Leider konnten wir keine Märkte{searchDescription ? ` für "${searchDescription}"` : ''} finden.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white"
                            style={{ background: 'var(--gradient-warm)' }}
                        >
                            Zur Startseite
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Markets Results */}
                        {markets.length > 0 && (
                            <div className="mb-12">
                                <h2
                                    className="text-2xl font-bold mb-6"
                                    style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                >
                                    {markets.length} Markt{markets.length !== 1 ? 'e' : ''} gefunden
                                </h2>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {markets.map((market) => (
                                        <Link
                                            href={`/shop/${market.id}`}
                                            key={market.id}
                                            className="group relative rounded-3xl overflow-hidden cursor-pointer block transition-transform duration-300 hover:scale-[1.02]"
                                            style={{
                                                background: 'white',
                                                boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
                                            }}
                                        >
                                            {/* Image */}
                                            <div className="relative aspect-[4/3] overflow-hidden">
                                                <img
                                                    src={market.header_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'}
                                                    alt={market.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                {market.is_premium && (
                                                    <div className="absolute top-4 right-4 badge-premium cursor-default shadow-lg">
                                                        Premium
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="relative p-6 pt-10">
                                                {/* Logo */}
                                                <div
                                                    className="absolute -top-8 left-6 w-[60px] h-[60px] rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-white"
                                                    style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)' }}
                                                >
                                                    {market.logo_url ? (
                                                        <img src={market.logo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div
                                                            className="w-full h-full flex items-center justify-center text-xl font-bold text-white"
                                                            style={{ background: 'var(--gradient-warm)' }}
                                                        >
                                                            {market.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>

                                                <h3
                                                    className="font-bold text-xl mb-2 truncate"
                                                    style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                                >
                                                    {market.name}
                                                </h3>

                                                <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--warm-gray)' }}>
                                                    {market.about_text || `Besuchen Sie ${market.name} für frische Produkte.`}
                                                </p>

                                                <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
                                                    <svg className="w-4 h-4" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {market.city}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Offers Results */}
                        {offers.length > 0 && (
                            <div>
                                <h2
                                    className="text-2xl font-bold mb-6"
                                    style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                >
                                    {offers.length} Angebot{offers.length !== 1 ? 'e' : ''} gefunden
                                </h2>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {offers.map((offer) => {
                                        const market = offer.markets as { name: string; city: string } | null;
                                        return (
                                            <Link
                                                href={`/shop/${offer.market_id}`}
                                                key={offer.id}
                                                className="group relative rounded-3xl overflow-hidden cursor-pointer block transition-transform duration-300 hover:scale-[1.02]"
                                                style={{
                                                    background: 'white',
                                                    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
                                                }}
                                            >
                                                {/* Image */}
                                                <div className="relative aspect-[4/3] overflow-hidden">
                                                    <img
                                                        src={offer.image_url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600'}
                                                        alt={offer.product_name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                </div>

                                                {/* Content */}
                                                <div className="p-6">
                                                    <h3
                                                        className="font-bold text-xl mb-2"
                                                        style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                                    >
                                                        {offer.product_name}
                                                    </h3>

                                                    <p className="text-sm mb-4" style={{ color: 'var(--warm-gray)' }}>
                                                        {market ? `${market.name} • ${market.city}` : 'Lokaler Markt'}
                                                    </p>

                                                    <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--sand)' }}>
                                                        <span className="text-2xl font-black" style={{ color: 'var(--terracotta)' }}>
                                                            {offer.price}
                                                        </span>
                                                        <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}>
                                                            Angebot
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
