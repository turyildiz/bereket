import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import SearchMarketGrid from '@/app/components/SearchMarketGrid';

interface SearchPageProps {
    searchParams: Promise<{
        city?: string;
        plz?: string;
        q?: string;
    }>;
}

// Market type
type MarketType = {
    id: string;
    slug: string;
    name: string;
    city: string;
    zip_code: string | null;
    logo_url: string | null;
    header_url: string | null;
    about_text: string | null;
    is_premium: boolean
};

// Offer type with market details
type OfferWithMarket = {
    id: string;
    product_name: string;
    description?: string | null;
    price: string;
    image_library: {
        url: string;
    } | null;
    market_id: string;
    markets: {
        slug: string;
        name: string;
        city: string;
        zip_code: string | null;
        logo_url: string | null;
    } | null;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams;
    const { city, plz, q } = params;

    const supabase = await createClient();

    // Results storage
    let matchingMarkets: MarketType[] = [];
    let nearbyMarkets: MarketType[] = [];
    let matchingOffers: OfferWithMarket[] = [];

    // Determine region prefix for regional filtering
    const regionPrefix = plz && plz.length >= 2 ? plz.substring(0, 2) : null;

    // ============ SEARCH LOGIC ============

    // Case 1: Query provided - search both shops AND products
    if (q) {
        // Search shops by name
        let shopQuery = supabase
            .from('markets')
            .select('id, slug, name, city, zip_code, logo_url, header_url, about_text, is_premium')
            .eq('is_active', true)
            .ilike('name', `%${q}%`);

        // Filter by location if provided
        if (regionPrefix) {
            shopQuery = shopQuery.ilike('zip_code', `${regionPrefix}%`);
        } else if (city) {
            shopQuery = shopQuery.ilike('city', `%${city}%`);
        }

        const { data: shopData } = await shopQuery
            .order('is_premium', { ascending: false })
            .limit(20);

        matchingMarkets = shopData || [];

        // Search products
        let productQuery = supabase
            .from('offers')
            .select('id, product_name, description, price, market_id, image_library(url), markets!inner(slug, name, city, zip_code, logo_url)')
            .eq('markets.is_active', true)
            .or(`product_name.ilike.%${q}%,description.ilike.%${q}%`)
            .eq('status', 'live')
            .gt('expires_at', new Date().toISOString());

        const { data: productData } = await productQuery
            .order('created_at', { ascending: false })
            .limit(50);

        let allOffers = (productData as unknown as OfferWithMarket[]) || [];

        // Filter offers by location if provided
        if (regionPrefix) {
            matchingOffers = allOffers.filter(offer =>
                offer.markets?.zip_code?.startsWith(regionPrefix)
            );
        } else if (city) {
            matchingOffers = allOffers.filter(offer =>
                offer.markets?.city?.toLowerCase().includes(city.toLowerCase())
            );
        } else {
            matchingOffers = allOffers;
        }
    }

    // Case 2: Only location provided (no query) - show all shops in area
    else if (city || plz) {
        let locationQuery = supabase
            .from('markets')
            .select('id, slug, name, city, zip_code, logo_url, header_url, about_text, is_premium')
            .eq('is_active', true);

        if (regionPrefix) {
            locationQuery = locationQuery.ilike('zip_code', `${regionPrefix}%`);
        } else if (city) {
            locationQuery = locationQuery.ilike('city', `%${city}%`);
        }

        const { data } = await locationQuery.order('is_premium', { ascending: false }).limit(50);
        const allMarkets = data || [];

        if (plz) {
            // Exact PLZ matches first
            matchingMarkets = allMarkets.filter(m => m.zip_code === plz);
            // Regional matches
            nearbyMarkets = allMarkets.filter(m => m.zip_code !== plz);
        } else {
            matchingMarkets = allMarkets;
        }
    }

    // ============ BUILD DISPLAY DATA ============
    const totalMarkets = matchingMarkets.length + nearbyMarkets.length;
    const totalOffers = matchingOffers.length;
    const hasResults = totalMarkets > 0 || totalOffers > 0;
    const totalResults = totalMarkets + totalOffers;

    // Build location string for display
    const locationDisplay = plz && city ? `${plz} ${city}` : plz || city || '';

    // Build search description
    const getHeaderText = () => {
        if (q && locationDisplay) {
            return { main: q, sub: `in ${locationDisplay}` };
        }
        if (q) {
            return { main: q, sub: 'deutschlandweit' };
        }
        if (locationDisplay) {
            return { main: locationDisplay, sub: 'Märkte entdecken' };
        }
        return { main: 'Suchergebnisse', sub: '' };
    };

    const headerText = getHeaderText();

    return (
        <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
            {/* Hero Header */}
            <section className="relative overflow-hidden">
                {/* Background */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, #2C2823 0%, #1a1714 50%, #2C2823 100%)'
                    }}
                />

                {/* Decorative blobs */}
                <div
                    className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
                    style={{ background: 'var(--saffron)' }}
                />
                <div
                    className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
                    style={{ background: 'var(--terracotta)' }}
                />

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumb */}
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

                    {/* Main Header Content */}
                    <div className="py-12 sm:py-16 lg:py-20">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                            <div className="flex-1">
                                {/* Result count badge */}
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
                                    style={{
                                        background: 'rgba(230, 168, 69, 0.15)',
                                        border: '1px solid rgba(230, 168, 69, 0.3)'
                                    }}
                                >
                                    <svg className="w-4 h-4" style={{ color: 'var(--saffron)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--saffron)' }}>
                                        {totalResults} {totalResults === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden
                                    </span>
                                </div>

                                {/* Main Title */}
                                <h1
                                    className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 animate-fade-in-up leading-tight"
                                    style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                                >
                                    <span className="text-gradient-warm">&ldquo;{headerText.main}&rdquo;</span>
                                    {headerText.sub && (
                                        <span className="block text-2xl sm:text-3xl text-white/70 mt-2 font-medium" style={{ fontFamily: 'inherit' }}>
                                            {headerText.sub}
                                        </span>
                                    )}
                                </h1>

                                {/* Subtitle */}
                                <p
                                    className="text-lg sm:text-xl text-white/70 max-w-xl animate-fade-in-up"
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    {hasResults
                                        ? 'Entdecke lokale Schätze in deiner Umgebung.'
                                        : 'Keine passenden Ergebnisse gefunden.'
                                    }
                                </p>
                            </div>

                            {/* Stats Card */}
                            {hasResults && (
                                <div
                                    className="hidden lg:flex flex-col gap-4 p-6 rounded-2xl animate-fade-in-up"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)',
                                        animationDelay: '0.3s'
                                    }}
                                >
                                    <div className="flex items-center gap-6">
                                        {totalMarkets > 0 && (
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                    {totalMarkets}
                                                </div>
                                                <div className="text-xs text-white/60 font-medium">Märkte</div>
                                            </div>
                                        )}
                                        {totalOffers > 0 && (
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                    {totalOffers}
                                                </div>
                                                <div className="text-xs text-white/60 font-medium">Angebote</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Curved bottom edge */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="var(--cream)" />
                    </svg>
                </div>
            </section>

            {/* Results Section */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {!hasResults ? (
                    /* Empty State */
                    <div className="text-center py-16 sm:py-24">
                        <div className="relative w-32 h-32 mx-auto mb-8">
                            <div
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ background: 'var(--saffron)', animationDuration: '2s' }}
                            />
                            <div
                                className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl"
                                style={{ background: 'white', boxShadow: '0 20px 60px rgba(230, 168, 69, 0.3)' }}
                            >
                                <svg className="w-14 h-14" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>

                        <h2
                            className="text-3xl sm:text-4xl font-black mb-4"
                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                        >
                            Keine Ergebnisse gefunden
                        </h2>

                        <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: 'var(--warm-gray)' }}>
                            Versuche es mit anderen Suchbegriffen oder einer anderen Stadt.
                        </p>

                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105"
                            style={{ background: 'var(--gradient-warm)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Zurück zur Startseite
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {/* Section 1: Matching Markets */}
                        {matchingMarkets.length > 0 && (
                            <div className="animate-fade-in-up">
                                <div className="flex items-center gap-4 mb-8">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                        style={{ background: 'var(--gradient-warm)' }}
                                    >
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2
                                            className="text-2xl sm:text-3xl font-black"
                                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                        >
                                            {matchingMarkets.length} {matchingMarkets.length === 1 ? 'Markt' : 'Märkte'}
                                            {plz ? ` in ${plz}` : city ? ` in ${city}` : q ? ` für "${q}"` : ''}
                                        </h2>
                                        <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                            Lokale orientalische Supermärkte
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    <SearchMarketGrid markets={matchingMarkets} />
                                </div>
                            </div>
                        )}

                        {/* Section 2: Nearby Markets (Regional) */}
                        {nearbyMarkets.length > 0 && (
                            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="flex-1 h-px" style={{ background: 'var(--sand)' }} />
                                    <span
                                        className="text-sm font-medium px-4 py-2 rounded-full"
                                        style={{ background: 'var(--sand)', color: 'var(--warm-gray)' }}
                                    >
                                        Weitere Märkte in der Region {regionPrefix}xxx
                                    </span>
                                    <div className="flex-1 h-px" style={{ background: 'var(--sand)' }} />
                                </div>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    <SearchMarketGrid markets={nearbyMarkets} />
                                </div>
                            </div>
                        )}

                        {/* Section 3: Matching Products/Offers */}
                        {matchingOffers.length > 0 && (
                            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <div className="flex items-center gap-4 mb-8">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                        style={{ background: 'linear-gradient(135deg, var(--mint) 0%, var(--cardamom) 100%)' }}
                                    >
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2
                                            className="text-2xl sm:text-3xl font-black"
                                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                        >
                                            {matchingOffers.length} {matchingOffers.length === 1 ? 'Angebot' : 'Angebote'}
                                            {q ? ` für "${q}"` : ''}
                                        </h2>
                                        <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                            Aktuelle Deals bei lokalen Märkten
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {matchingOffers.map((offer, idx) => (
                                        <OfferCard key={offer.id} offer={offer} index={idx} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Bottom CTA */}
            {hasResults && (
                <section className="py-16 sm:py-20">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                        <h2
                            className="text-3xl sm:text-4xl font-black mb-4"
                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                        >
                            Nicht das Richtige gefunden?
                        </h2>
                        <p className="text-lg mb-8" style={{ color: 'var(--warm-gray)' }}>
                            Starte eine neue Suche auf unserer Startseite.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105"
                            style={{ background: 'var(--charcoal)', color: 'white' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Neue Suche starten
                        </Link>
                    </div>
                </section>
            )}
        </main>
    );
}

// ============ OFFER CARD COMPONENT ============
function OfferCard({ offer, index }: { offer: OfferWithMarket; index: number }) {
    const market = offer.markets;
    const marketName = market?.name || 'Lokaler Markt';
    const marketLogo = market?.logo_url;
    const marketLocation = market?.zip_code && market?.city
        ? `${market.zip_code} ${market.city}`
        : market?.city || '';

    return (
        <Link
            href={`/shop/${offer.markets?.slug || ''}`}
            className="group relative rounded-3xl overflow-hidden cursor-pointer block transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 animate-scale-in"
            style={{
                background: 'white',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                animationDelay: `${index * 0.05}s`
            }}
        >
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#f8f5f0' }}>
                <img
                    src={offer.image_library?.url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600'}
                    alt={offer.product_name}
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Price Badge - Top Right */}
                <div className="absolute top-4 right-4 px-4 py-2 rounded-2xl shadow-lg" style={{ background: 'white' }}>
                    <span className="text-xl font-black" style={{ color: 'var(--terracotta)' }}>
                        {offer.price}
                    </span>
                </div>

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
                    className="font-bold text-lg mb-3 group-hover:text-[var(--cardamom)] transition-colors duration-300"
                    style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                >
                    {offer.product_name}
                </h3>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                    {/* Market Location */}
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--warm-gray)' }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium">{marketLocation}</span>
                    </div>

                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                        style={{ background: 'var(--mint)' }}
                    >
                        <svg className="w-4 h-4" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
