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

// Enhanced Offer type with market details including zip_code
type OfferWithMarket = {
    id: string;
    product_name: string;
    description?: string | null;
    price: string;
    original_price?: string;
    image_url: string | null;
    market_id: string;
    markets: {
        name: string;
        city: string;
        zip_code: string | null;
    } | null;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const params = await searchParams;
    const { city, plz, q, type } = params;

    const supabase = await createClient();

    // Store results
    type MarketType = { id: string; name: string; city: string; zip_code: string | null; location: string; logo_url: string | null; header_url: string | null; about_text: string | null; is_premium: boolean };
    let exactPlzMarkets: MarketType[] = [];
    let otherCityMarkets: MarketType[] = [];
    let nameMatchMarkets: MarketType[] = [];

    // Offers with regional grouping - Section A (local) and Section B (regional)
    let localOffers: OfferWithMarket[] = [];
    let regionalOffers: OfferWithMarket[] = [];

    // 1. Location-based search (Regional Zone)
    if (city || plz) {
        let query = supabase
            .from('markets')
            .select('id, name, city, zip_code, location, logo_url, header_url, about_text, is_premium');

        // Logic A: PLZ is priority (Regional Search)
        if (plz && plz.length >= 2) {
            const regionPrefix = plz.substring(0, 2); // Get first 2 digits, e.g. "60"
            query = query.ilike('zip_code', `${regionPrefix}%`);
        }
        // Logic B: City fallback
        else if (city) {
            query = query.ilike('city', `%${city}%`);
        }

        const { data } = await query.order('is_premium', { ascending: false }).limit(50);
        const allMarkets = data || [];

        if (plz) {
            exactPlzMarkets = allMarkets.filter(m => m.zip_code === plz);
            // Nearby = Matches region prefix but NOT exact PLZ
            otherCityMarkets = allMarkets.filter(m => m.zip_code !== plz);
        } else {
            // Just city search results
            otherCityMarkets = allMarkets;
        }
    }

    // 2. Market name search
    if (type === 'markets' && q) {
        const { data } = await supabase
            .from('markets')
            .select('id, name, city, zip_code, location, logo_url, header_url, about_text, is_premium')
            .ilike('name', `%${q}%`)
            .order('is_premium', { ascending: false })
            .limit(20);
        nameMatchMarkets = data || [];
    }

    // 3. Offers/product search with market details for regional grouping
    // Search by product_name OR description, join with markets for location context
    if (type === 'offers' && q) {
        const { data } = await supabase
            .from('offers')
            .select('id, product_name, description, price, original_price, image_url, market_id, markets(name, city, zip_code)')
            .or(`product_name.ilike.%${q}%,description.ilike.%${q}%`)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(50);

        const allOffers = (data as unknown as OfferWithMarket[]) || [];

        // Apply Regional Expansion Logic for products
        if (plz && plz.length >= 2) {
            // Section A: Exact match - offers from markets in user's exact PLZ or city
            localOffers = allOffers.filter(offer =>
                offer.markets?.zip_code === plz ||
                (city && offer.markets?.city?.toLowerCase() === city.toLowerCase())
            );

            // Section B: Regional Zone - offers from markets with same PLZ prefix (first 2 digits)
            const regionPrefix = plz.substring(0, 2);
            regionalOffers = allOffers.filter(offer => {
                const offerZip = offer.markets?.zip_code;
                if (!offerZip) return false;
                // In regional but NOT in local (avoid duplicates)
                const isRegional = offerZip.startsWith(regionPrefix) && offerZip !== plz;
                const isNotLocal = !localOffers.some(lo => lo.id === offer.id);
                return isRegional && isNotLocal;
            });
        } else if (city) {
            // Section A: Offers in user's city
            localOffers = allOffers.filter(offer =>
                offer.markets?.city?.toLowerCase() === city.toLowerCase()
            );

            // Section B: All other offers (not in user's city)
            regionalOffers = allOffers.filter(offer =>
                offer.markets?.city?.toLowerCase() !== city.toLowerCase()
            );
        } else {
            // No location context - show all offers
            localOffers = allOffers;
        }
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
    const totalOffers = localOffers.length + regionalOffers.length;
    const hasResults = exactPlzMarkets.length > 0 || otherCityMarkets.length > 0 || nameMatchMarkets.length > 0 || totalOffers > 0;
    const totalResults = exactPlzMarkets.length + otherCityMarkets.length + nameMatchMarkets.length + totalOffers;

    // Get search type label
    const getSearchTypeLabel = () => {
        if (type === 'offers') return 'Angebote';
        if (type === 'markets') return 'Märkte';
        return 'Märkte';
    };

    return (
        <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
            {/* Hero Header with Elegant Design */}
            <section className="relative overflow-hidden">
                {/* Background with layered gradient */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, #2C2823 0%, #1a1714 50%, #2C2823 100%)'
                    }}
                />

                {/* Decorative mesh gradient blobs */}
                <div
                    className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
                    style={{ background: 'var(--saffron)' }}
                />
                <div
                    className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
                    style={{ background: 'var(--terracotta)' }}
                />

                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />

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
                            {/* Left: Title and Description */}
                            <div className="flex-1">
                                {/* Search Type Badge */}
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
                                    style={{
                                        background: type === 'offers' ? 'rgba(124, 201, 163, 0.15)' : 'rgba(230, 168, 69, 0.15)',
                                        border: type === 'offers' ? '1px solid rgba(124, 201, 163, 0.3)' : '1px solid rgba(230, 168, 69, 0.3)'
                                    }}
                                >
                                    {type === 'offers' ? (
                                        <svg className="w-4 h-4" style={{ color: 'var(--mint)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" style={{ color: 'var(--saffron)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    )}
                                    <span className="text-sm font-semibold" style={{ color: type === 'offers' ? 'var(--mint)' : 'var(--saffron)' }}>
                                        {getSearchTypeLabel()} {city || plz ? 'in der Nähe' : 'Suche'}
                                    </span>
                                </div>

                                {/* Main Title */}
                                <h1
                                    className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 animate-fade-in-up leading-tight"
                                    style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                                >
                                    {type === 'offers' && q ? (
                                        <>
                                            <span className="block text-white/90">{totalOffers} {totalOffers === 1 ? 'Angebot' : 'Angebote'} für</span>
                                            <span className="text-gradient-warm">&ldquo;{q}&rdquo;</span>
                                        </>
                                    ) : searchDescription ? (
                                        <>
                                            <span className="block text-white/90">{type === 'offers' ? 'Angebote für' : type === 'markets' ? 'Ergebnisse für' : 'Entdecke'}</span>
                                            <span className="text-gradient-warm">{searchDescription}</span>
                                        </>
                                    ) : (
                                        'Suchergebnisse'
                                    )}
                                </h1>

                                {/* Subtitle */}
                                <p
                                    className="text-lg sm:text-xl text-white/70 max-w-xl animate-fade-in-up"
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    {hasResults
                                        ? type === 'offers'
                                            ? 'Entdecke die besten Deals bei lokalen Märkten.'
                                            : `${totalResults} ${totalResults === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden – entdecke lokale Schätze in deiner Nähe.`
                                        : 'Finde die besten Märkte und Angebote in deiner Umgebung.'
                                    }
                                </p>
                            </div>

                            {/* Right: Stats Card */}
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
                                        {exactPlzMarkets.length > 0 && (
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                    {exactPlzMarkets.length}
                                                </div>
                                                <div className="text-xs text-white/60 font-medium">Exakt</div>
                                            </div>
                                        )}
                                        {otherCityMarkets.length > 0 && (
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                    {otherCityMarkets.length}
                                                </div>
                                                <div className="text-xs text-white/60 font-medium">In der Nähe</div>
                                            </div>
                                        )}
                                        {nameMatchMarkets.length > 0 && (
                                            <div className="text-center">
                                                <div className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
                                                    {nameMatchMarkets.length}
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
                        <div
                            className="relative w-32 h-32 mx-auto mb-8"
                        >
                            {/* Animated rings */}
                            <div
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ background: type === 'offers' ? 'var(--mint)' : 'var(--saffron)', animationDuration: '2s' }}
                            />
                            <div
                                className="absolute inset-4 rounded-full animate-ping opacity-30"
                                style={{ background: type === 'offers' ? 'var(--cardamom)' : 'var(--terracotta)', animationDuration: '2.5s', animationDelay: '0.5s' }}
                            />
                            {/* Main icon container */}
                            <div
                                className="relative w-full h-full rounded-full flex items-center justify-center shadow-2xl"
                                style={{
                                    background: 'white',
                                    boxShadow: type === 'offers' ? '0 20px 60px rgba(124, 201, 163, 0.3)' : '0 20px 60px rgba(230, 168, 69, 0.3)'
                                }}
                            >
                                {type === 'offers' ? (
                                    <svg
                                        className="w-14 h-14"
                                        style={{ color: 'var(--cardamom)' }}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-14 h-14"
                                        style={{ color: 'var(--terracotta)' }}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>

                        <h2
                            className="text-3xl sm:text-4xl font-black mb-4"
                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                        >
                            {type === 'offers' ? 'Kein Angebot gefunden' : type === 'markets' ? 'Keinen Markt gefunden' : 'Keine Ergebnisse gefunden'}
                        </h2>

                        {type === 'offers' ? (
                            <div className="mb-10 max-w-xl mx-auto">
                                <p
                                    className="text-lg sm:text-xl mb-6 leading-relaxed"
                                    style={{ color: 'var(--warm-gray)' }}
                                >
                                    Wir konnten leider kein Angebot{searchDescription ? ` für "${searchDescription}"` : ''} finden.
                                </p>
                                {/* Suggestion box for offers */}
                                <div
                                    className="p-6 rounded-2xl text-left"
                                    style={{ background: 'rgba(124, 201, 163, 0.1)', border: '1px solid rgba(124, 201, 163, 0.3)' }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-2" style={{ color: 'var(--charcoal)' }}>
                                                Tipp: Probiere es mal mit...
                                            </p>
                                            <ul className="space-y-2 text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                <li className="flex items-center gap-2">
                                                    <span style={{ color: 'var(--cardamom)' }}>→</span>
                                                    Suche nach <Link href="/search?type=offers&q=Baklava" className="font-bold underline hover:text-[var(--cardamom)] transition-colors">&ldquo;Baklava&rdquo;</Link> oder <Link href="/search?type=offers&q=Oliven" className="font-bold underline hover:text-[var(--cardamom)] transition-colors">&ldquo;Oliven&rdquo;</Link>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span style={{ color: 'var(--cardamom)' }}>→</span>
                                                    Nutze die <Link href="/" className="font-bold underline hover:text-[var(--cardamom)] transition-colors">&ldquo;Ort&rdquo; Suche</Link> um Märkte mit Angeboten in deiner Nähe zu finden
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : type === 'markets' ? (
                            <div className="mb-10 max-w-xl mx-auto">
                                <p
                                    className="text-lg sm:text-xl mb-6 leading-relaxed"
                                    style={{ color: 'var(--warm-gray)' }}
                                >
                                    Wir konnten leider keinen Markt{searchDescription ? ` für "${searchDescription}"` : ''} finden.
                                </p>
                                {/* Suggestion box */}
                                <div
                                    className="p-6 rounded-2xl text-left"
                                    style={{ background: 'var(--cream-dark)', border: '1px solid var(--sand)' }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: 'var(--saffron)', color: 'white' }}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-2" style={{ color: 'var(--charcoal)' }}>
                                                Tipp: Probiere es mal mit...
                                            </p>
                                            <ul className="space-y-2 text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                <li className="flex items-center gap-2">
                                                    <span style={{ color: 'var(--terracotta)' }}>→</span>
                                                    Suche nach <Link href="/search?type=markets&q=Istanbul" className="font-bold underline hover:text-[var(--terracotta)] transition-colors">&ldquo;Istanbul&rdquo;</Link> oder <Link href="/search?type=markets&q=Sultan" className="font-bold underline hover:text-[var(--terracotta)] transition-colors">&ldquo;Sultan&rdquo;</Link>
                                                </li>
                                                <li className="flex items-center gap-2">
                                                    <span style={{ color: 'var(--terracotta)' }}>→</span>
                                                    Nutze die <Link href="/" className="font-bold underline hover:text-[var(--terracotta)] transition-colors">&ldquo;Ort&rdquo; Suche</Link> um Märkte in deiner Nähe zu finden
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p
                                className="text-lg sm:text-xl mb-10 max-w-lg mx-auto leading-relaxed"
                                style={{ color: 'var(--warm-gray)' }}
                            >
                                Wir konnten leider keine Ergebnisse{searchDescription ? ` für "${searchDescription}"` : ''} finden.
                                Versuche es mit einer anderen Suche.
                            </p>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/"
                                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                                style={{ background: type === 'offers' ? 'linear-gradient(135deg, var(--mint) 0%, var(--cardamom) 100%)' : 'var(--gradient-warm)' }}
                            >
                                <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Zur Startseite
                            </Link>
                            <Link
                                href="/shops"
                                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 border-2"
                                style={{
                                    borderColor: 'var(--charcoal)',
                                    color: 'var(--charcoal)',
                                    background: 'transparent'
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Alle Märkte
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Results Grid */
                    <div className="space-y-16">
                        {/* 1. Exact PLZ Matches - Primary Results */}
                        {exactPlzMarkets.length > 0 && (
                            <div className="animate-fade-in-up">
                                {/* Section Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                            style={{ background: 'var(--gradient-warm)' }}
                                        >
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2
                                                className="text-2xl sm:text-3xl font-black"
                                                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                            >
                                                In <span style={{ color: 'var(--terracotta)' }}>{plz}</span> {city}
                                            </h2>
                                            <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                Exakte Treffer in deiner Postleitzahl
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-bold shadow-md"
                                        style={{ background: 'var(--saffron)', color: 'white' }}
                                    >
                                        {exactPlzMarkets.length} {exactPlzMarkets.length === 1 ? 'Markt' : 'Märkte'}
                                    </span>
                                </div>

                                {/* Markets Grid */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {exactPlzMarkets.map((market, idx) => (
                                        <MarketCard key={market.id} market={market} index={idx} featured />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Nearby Markets */}
                        {otherCityMarkets.length > 0 && (
                            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                {/* Divider if there are exact matches */}
                                {exactPlzMarkets.length > 0 && (
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--sand), transparent)' }} />
                                        <span
                                            className="text-sm font-medium px-4 py-2 rounded-full"
                                            style={{ background: 'var(--sand)', color: 'var(--warm-gray)' }}
                                        >
                                            Weitere in der Nähe
                                        </span>
                                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--sand), transparent)' }} />
                                    </div>
                                )}

                                {/* Section Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                            style={{ background: 'var(--gradient-fresh)' }}
                                        >
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2
                                                className="text-2xl sm:text-3xl font-black"
                                                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                            >
                                                {exactPlzMarkets.length > 0 ? 'Weitere Märkte' : `Märkte in ${city || 'deiner Region'}`}
                                            </h2>
                                            <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                {exactPlzMarkets.length > 0 ? 'Entdecke noch mehr in der Umgebung' : 'Alle verfügbaren Märkte'}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-bold"
                                        style={{ background: 'var(--cream-dark)', color: 'var(--charcoal)', border: '1px solid var(--sand)' }}
                                    >
                                        {otherCityMarkets.length} {otherCityMarkets.length === 1 ? 'Markt' : 'Märkte'}
                                    </span>
                                </div>

                                {/* Markets Grid */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {otherCityMarkets.map((market, idx) => (
                                        <MarketCard key={market.id} market={market} index={idx} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Name Match Results */}
                        {nameMatchMarkets.length > 0 && (
                            <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                                {/* Section Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div className="flex items-center gap-4">
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
                                                Ergebnisse für &ldquo;{q}&rdquo;
                                            </h2>
                                            <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                Märkte die zu deiner Suche passen
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-bold shadow-md"
                                        style={{ background: 'var(--saffron)', color: 'white' }}
                                    >
                                        {nameMatchMarkets.length} {nameMatchMarkets.length === 1 ? 'Treffer' : 'Treffer'}
                                    </span>
                                </div>

                                {/* Markets Grid */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {nameMatchMarkets.map((market, idx) => (
                                        <MarketCard key={market.id} market={market} index={idx} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. Offers Results - Regional Expansion Logic */}
                        {/* Section A: Local Offers - In user's selected City/PLZ */}
                        {localOffers.length > 0 && (
                            <div className="animate-fade-in-up py-12" style={{ animationDelay: '0.2s' }}>
                                {/* Section Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                            style={{ background: 'linear-gradient(135deg, var(--mint) 0%, var(--cardamom) 100%)' }}
                                        >
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2
                                                className="text-2xl sm:text-3xl font-black"
                                                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                            >
                                                &ldquo;{q}&rdquo; {plz ? `in ${plz}` : city ? `in ${city}` : 'in deiner Nähe'}
                                            </h2>
                                            <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                Angebote bei Märkten in deiner direkten Umgebung
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-bold shadow-md"
                                        style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}
                                    >
                                        {localOffers.length} {localOffers.length === 1 ? 'Angebot' : 'Angebote'}
                                    </span>
                                </div>

                                {/* Local Offers Grid - High-end Product Cards */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {localOffers.map((offer, idx) => (
                                        <OfferCard key={offer.id} offer={offer} index={idx} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section B: Regional Offers - In nearby postal code area */}
                        {regionalOffers.length > 0 && (
                            <div className="animate-fade-in-up py-12" style={{ animationDelay: '0.3s' }}>
                                {/* Divider if there are local offers */}
                                {localOffers.length > 0 && (
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--sand), transparent)' }} />
                                        <span
                                            className="text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2"
                                            style={{ background: 'var(--sand)', color: 'var(--warm-gray)' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7" />
                                            </svg>
                                            Auch in der Region erhältlich
                                        </span>
                                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--sand), transparent)' }} />
                                    </div>
                                )}

                                {/* Section Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                            style={{ background: 'var(--gradient-fresh)' }}
                                        >
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2
                                                className="text-2xl sm:text-3xl font-black"
                                                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                            >
                                                &ldquo;{q}&rdquo; in der Region {plz ? plz.substring(0, 2) + 'xxx' : ''}
                                            </h2>
                                            <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                                Weitere Angebote bei Märkten in deiner erweiterten Region
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className="inline-flex items-center px-5 py-2 rounded-full text-sm font-bold"
                                        style={{ background: 'var(--cream-dark)', color: 'var(--charcoal)', border: '1px solid var(--sand)' }}
                                    >
                                        {regionalOffers.length} weitere
                                    </span>
                                </div>

                                {/* Regional Offers Grid - High-end Product Cards */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {regionalOffers.map((offer, idx) => (
                                        <OfferCard key={offer.id} offer={offer} index={idx} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fallback: Show all offers if no location context */}
                        {localOffers.length === 0 && regionalOffers.length === 0 && totalOffers === 0 && type === 'offers' && q && (
                            <div className="text-center py-12">
                                <p className="text-lg" style={{ color: 'var(--warm-gray)' }}>
                                    Keine Angebote für &ldquo;{q}&rdquo; gefunden.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom CTA */}
                {hasResults && (
                    <div
                        className="mt-20 text-center p-8 sm:p-12 rounded-3xl relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, var(--charcoal) 0%, #1a1714 100%)'
                        }}
                    >
                        {/* Decorative elements */}
                        <div
                            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
                            style={{ background: type === 'offers' ? 'var(--mint)' : 'var(--saffron)' }}
                        />
                        <div
                            className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15 blur-3xl"
                            style={{ background: type === 'offers' ? 'var(--cardamom)' : 'var(--terracotta)' }}
                        />

                        <div className="relative z-10">
                            <h3
                                className="text-2xl sm:text-3xl font-black text-white mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                {type === 'offers' ? 'Noch mehr Angebote?' : 'Nicht das Richtige dabei?'}
                            </h3>
                            <p className="text-white/70 mb-8 max-w-lg mx-auto">
                                {type === 'offers'
                                    ? 'Entdecke alle aktuellen Deals von unseren Partner-Märkten.'
                                    : 'Entdecke alle unsere Partner-Märkte oder starte eine neue Suche.'
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    href="/"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                                    style={{ background: type === 'offers' ? 'linear-gradient(135deg, var(--mint) 0%, var(--cardamom) 100%)' : 'var(--gradient-warm)' }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Neue Suche
                                </Link>
                                <Link
                                    href="/shops"
                                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300"
                                >
                                    Alle Märkte
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}

// Market Card Component
function MarketCard({
    market,
    index,
    featured = false
}: {
    market: { id: string; name: string; city: string; zip_code: string | null; location: string; logo_url: string | null; header_url: string | null; about_text: string | null; is_premium: boolean };
    index: number;
    featured?: boolean;
}) {
    const teaser = market.about_text
        ? market.about_text.length > 90
            ? market.about_text.substring(0, 90).trim() + '...'
            : market.about_text
        : `Besuchen Sie ${market.name} für frische Produkte und tolle Angebote.`;

    return (
        <Link
            href={`/shop/${market.id}`}
            className="group relative rounded-3xl overflow-hidden cursor-pointer block transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 animate-scale-in"
            style={{
                background: 'white',
                boxShadow: featured
                    ? '0 8px 40px rgba(230, 168, 69, 0.15)'
                    : '0 4px 20px rgba(0, 0, 0, 0.06)',
                animationDelay: `${index * 0.05}s`
            }}
        >
            {/* Featured Ring */}
            {featured && (
                <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                        boxShadow: 'inset 0 0 0 3px var(--saffron)'
                    }}
                />
            )}

            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden">
                <img
                    src={market.header_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'}
                    alt={market.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Premium Badge */}
                {market.is_premium && (
                    <div className="absolute top-4 right-4 badge-premium cursor-default shadow-lg flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Premium
                    </div>
                )}

                {/* Quick view button on hover */}
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                    <span
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white backdrop-blur-md"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ansehen
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="relative p-6 pt-12">
                {/* Logo - Overlapping */}
                <div
                    className="absolute -top-8 left-6 w-16 h-16 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white transition-transform duration-500 group-hover:scale-110"
                    style={{ boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)' }}
                >
                    {market.logo_url ? (
                        <img src={market.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                            style={{ background: 'var(--gradient-warm)' }}
                        >
                            {market.name.charAt(0)}
                        </div>
                    )}
                </div>

                <h3
                    className="font-bold text-xl mb-2 truncate group-hover:text-[var(--terracotta)] transition-colors duration-300"
                    style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                >
                    {market.name}
                </h3>

                <p
                    className="text-sm mb-4 line-clamp-2 leading-relaxed"
                    style={{ color: 'var(--warm-gray)' }}
                >
                    {teaser}
                </p>

                <div
                    className="flex items-center justify-between pt-4 border-t"
                    style={{ borderColor: 'var(--sand)' }}
                >
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
                        <svg
                            className="w-4 h-4 shrink-0"
                            style={{ color: 'var(--terracotta)' }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{market.zip_code ? `${market.zip_code} ` : ''}{market.city}</span>
                    </div>

                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
                        style={{ background: featured ? 'var(--saffron)' : 'var(--cream)' }}
                    >
                        <svg
                            className="w-5 h-5"
                            style={{ color: featured ? 'white' : 'var(--terracotta)' }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// Offer Card Component - High-end Product Card Design
function OfferCard({
    offer,
    index
}: {
    offer: OfferWithMarket;
    index: number;
}) {
    const market = offer.markets;
    const hasDiscount = !!offer.original_price;

    return (
        <Link
            href={`/shop/${offer.market_id}`}
            className="group relative rounded-3xl overflow-hidden cursor-pointer block transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 animate-scale-in"
            style={{
                background: 'white',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
                animationDelay: `${index * 0.05}s`
            }}
        >
            {/* Hover Ring Effect */}
            <div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    boxShadow: 'inset 0 0 0 3px var(--mint)'
                }}
            />

            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden">
                <img
                    src={offer.image_url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600'}
                    alt={offer.product_name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Discount Badge */}
                {hasDiscount && (
                    <div
                        className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1"
                        style={{ background: 'var(--terracotta)', color: 'white' }}
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                        </svg>
                        ANGEBOT
                    </div>
                )}

                {/* Price Tag - Floating */}
                <div
                    className="absolute top-4 right-4 px-4 py-2 rounded-2xl shadow-lg"
                    style={{ background: 'white' }}
                >
                    <div className="flex items-baseline gap-2">
                        <span
                            className="text-xl font-black"
                            style={{ color: 'var(--cardamom)' }}
                        >
                            {offer.price}
                        </span>
                        {hasDiscount && (
                            <span
                                className="text-xs line-through"
                                style={{ color: 'var(--warm-gray)' }}
                            >
                                {offer.original_price}
                            </span>
                        )}
                    </div>
                </div>

                {/* Quick view button on hover */}
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                    <span
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white backdrop-blur-md"
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Zum Markt
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <h3
                    className="font-bold text-xl mb-3 group-hover:text-[var(--cardamom)] transition-colors duration-300"
                    style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                >
                    {offer.product_name}
                </h3>

                {/* Market Info */}
                <div
                    className="flex items-center justify-between pt-4 border-t"
                    style={{ borderColor: 'var(--sand)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm"
                            style={{ background: 'var(--gradient-warm)' }}
                        >
                            {market?.name.charAt(0) || 'M'}
                        </div>
                        <div>
                            <div className="text-sm font-bold" style={{ color: 'var(--charcoal)' }}>
                                {market?.name || 'Lokaler Markt'}
                            </div>
                            <div className="text-xs flex items-center gap-1" style={{ color: 'var(--warm-gray)' }}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                </svg>
                                {market?.city || 'Deutschland'}
                            </div>
                        </div>
                    </div>

                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0"
                        style={{ background: 'var(--mint)' }}
                    >
                        <svg
                            className="w-5 h-5"
                            style={{ color: 'var(--cardamom)' }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    );
}
