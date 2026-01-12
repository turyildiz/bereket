import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import HeroSearchBar from './components/HeroSearchBar';
import MarketGridClient from './components/MarketGridClient';
import MobileMarketScroll from './components/MobileMarketScroll';
import OffersSection from './components/OffersSection';

export default async function Home() {
  const supabase = await createClient();

  // Fetch top 6 premium markets
  const { data: premiumMarkets } = await supabase
    .from('markets')
    .select('id, name, city, header_url, logo_url, about_text, is_premium')
    .eq('is_premium', true)
    .order('created_at', { ascending: false })
    .limit(6);

  // Fetch newest markets (6 most recently created)
  const { data: newestMarkets } = await supabase
    .from('markets')
    .select('id, name, city, header_url, logo_url, about_text, is_premium')
    .order('created_at', { ascending: false })
    .limit(6);

  // Fetch 10 recent offers from premium markets for hero floating cards
  const { data: premiumOffers } = await supabase
    .from('offers')
    .select('id, product_name, price, image_url, market_id, markets!inner(id, name, city, is_premium)')
    .eq('markets.is_premium', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  // Select 2 random offers for hero display
  const heroOffers = premiumOffers && premiumOffers.length >= 2
    ? premiumOffers.sort(() => Math.random() - 0.5).slice(0, 2)
    : premiumOffers || [];

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Hero Section - Stunning Customer-Focused Design */}
      <section className="relative min-h-[90vh] flex items-center overflow-x-clip">
        {/* Full-Screen Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920"
            alt="Fresh market produce"
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlays */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(44, 40, 35, 0.85) 0%, rgba(44, 40, 35, 0.4) 50%, rgba(44, 40, 35, 0.7) 100%)' }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full opacity-20 blur-3xl animate-float" style={{ background: 'var(--saffron)' }}></div>
        <div className="absolute bottom-40 left-10 w-72 h-72 rounded-full opacity-15 blur-3xl animate-float" style={{ background: 'var(--terracotta)', animationDelay: '2s' }}></div>

        {/* Content Container - Grid Layout to keep cards within bounds */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:px-10 lg:px-8 w-full">
          <div className="grid lg:grid-cols-5 gap-8 items-center">
            {/* Left Content - Takes 3 columns */}
            <div className="lg:col-span-3">
              {/* Location Badge */}
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full mb-8 animate-fade-in-up backdrop-blur-md" style={{ background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#22C55E' }}></span>
                  <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: '#22C55E' }}></span>
                </span>
                <span className="text-sm font-semibold text-white">247 Angebote heute in Frankfurt</span>
              </div>

              {/* Main Headline */}
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 animate-fade-in-up text-white"
                style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
              >
                Entdecke die
                <br />
                <span className="relative inline-block">
                  <span className="text-gradient-warm">besten Deals</span>
                </span>
                <br />
                deiner Stadt
              </h1>

              {/* Subheadline */}
              <p
                className="text-xl sm:text-2xl leading-relaxed mb-10 animate-fade-in-up max-w-xl"
                style={{ color: 'rgba(255, 255, 255, 0.85)', animationDelay: '0.2s' }}
              >
                Frische Angebote von türkischen, arabischen & orientalischen Märkten – täglich neu für dich.
              </p>


              {/* Search Bar with Tabs */}
              <HeroSearchBar />
            </div>

            {/* Right Column - Floating Deal Cards - Takes 2 columns */}
            <div className="lg:col-span-2 hidden lg:flex justify-center items-center">
              <div className="relative">
                {/* Main Deal Card - Dynamic or Fallback */}
                {heroOffers.length > 0 ? (
                  <>
                    {/* Primary Card */}
                    <Link
                      href={`/shop/${heroOffers[0].market_id}`}
                      className="block bg-white rounded-3xl shadow-2xl p-5 w-72 transform rotate-3 hover:rotate-0 transition-all duration-500 hover:scale-105 animate-float cursor-pointer"
                    >
                      <div className="relative rounded-2xl overflow-hidden mb-4">
                        <img
                          src={heroOffers[0].image_url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=400'}
                          alt={heroOffers[0].product_name}
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute top-3 right-3 badge-premium text-xs">Premium</div>
                      </div>
                      <h4 className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                        {heroOffers[0].product_name}
                      </h4>
                      <p className="text-sm mb-3" style={{ color: 'var(--warm-gray)' }}>
                        {(heroOffers[0].markets as unknown as { name: string; city: string }).name} • {(heroOffers[0].markets as unknown as { name: string; city: string }).city}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black" style={{ color: 'var(--terracotta)' }}>{heroOffers[0].price}</span>
                        <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}>Angebot</span>
                      </div>
                    </Link>

                    {/* Secondary Card */}
                    {heroOffers.length > 1 && (
                      <Link
                        href={`/shop/${heroOffers[1].market_id}`}
                        className="absolute -bottom-20 -left-16 block bg-white rounded-2xl shadow-xl p-4 w-56 transform -rotate-6 hover:rotate-0 transition-all duration-500 animate-float cursor-pointer"
                        style={{ animationDelay: '1s' }}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={heroOffers[1].image_url || 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=100'}
                            alt={heroOffers[1].product_name}
                            className="w-14 h-14 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-bold text-sm" style={{ color: 'var(--charcoal)' }}>{heroOffers[1].product_name}</p>
                            <p className="text-xl font-black" style={{ color: 'var(--terracotta)' }}>{heroOffers[1].price}</p>
                          </div>
                        </div>
                      </Link>
                    )}
                  </>
                ) : (
                  /* Fallback Static Cards */
                  <>
                    <div className="bg-white rounded-3xl shadow-2xl p-5 w-72 transform rotate-3 hover:rotate-0 transition-all duration-500 hover:scale-105 animate-float">
                      <div className="relative rounded-2xl overflow-hidden mb-4">
                        <img
                          src="https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=400"
                          alt="Fresh vegetables"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                      <h4 className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>Bio Gemüse Mix</h4>
                      <p className="text-sm mb-3" style={{ color: 'var(--warm-gray)' }}>Sultan Markt • Frankfurt</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black" style={{ color: 'var(--terracotta)' }}>3.99€</span>
                        <span className="text-xs px-3 py-1.5 rounded-full font-bold" style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}>-40%</span>
                      </div>
                    </div>

                    <div className="absolute -bottom-20 -left-16 bg-white rounded-2xl shadow-xl p-4 w-56 transform -rotate-6 hover:rotate-0 transition-all duration-500 animate-float" style={{ animationDelay: '1s' }}>
                      <div className="flex items-center gap-3">
                        <img
                          src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=100"
                          alt="Spices"
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--charcoal)' }}>Gewürz Set</p>
                          <p className="text-xl font-black" style={{ color: 'var(--terracotta)' }}>4.99€</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-white/80 animate-scroll-down"></div>
          </div>
        </div>
      </section>

      {/* Featured Shops Section - Dynamic from Supabase */}
      {premiumMarkets && premiumMarkets.length > 0 && (
        <section className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 sm:px-6 lg:px-8">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ background: 'var(--cream)', color: 'var(--warm-gray)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span className="text-sm font-bold">Handverlesen</span>
              </div>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
              >
                Empfohlene Shops
              </h2>
              <p className="text-lg sm:text-xl" style={{ color: 'var(--warm-gray)' }}>
                Die beliebtesten Märkte in deiner Region.
              </p>
            </div>
            <Link
              href="/shops/premium"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:gap-4 cursor-pointer"
              style={{ background: 'var(--charcoal)', color: 'white' }}
            >
              Alle ansehen
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <MarketGridClient markets={premiumMarkets} variant="premium" />
          </div>
        </section>
      )}
      {/* ========== NEU DABEI SECTION ========== */}
      {newestMarkets && newestMarkets.length > 0 && (
        <section className="relative mx-auto max-w-7xl px-4 py-20 sm:py-24 sm:px-6 lg:px-8">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm font-bold">Frisch dabei</span>
              </div>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
              >
                Neu Dabei
              </h2>
              <p className="text-lg sm:text-xl" style={{ color: 'var(--warm-gray)' }}>
                Entdecke die neuesten Märkte in deiner Community.
              </p>
            </div>
            <Link
              href="/shops/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:gap-4 cursor-pointer"
              style={{ background: 'var(--charcoal)', color: 'white' }}
            >
              Alle ansehen
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Mobile: Horizontal Scroll */}
          <MobileMarketScroll markets={newestMarkets} />

          {/* Desktop: Standard Grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-8">
            <MarketGridClient markets={newestMarkets} variant="new" />
          </div>
        </section>
      )}

      {/* Latest Offers Section - Dynamic based on favorites */}
      <OffersSection />

      {/* CTA Section - NEW */}
      <section className="relative py-20 sm:py-28 overflow-hidden" style={{ background: 'var(--gradient-night)' }}>
        {/* Decorative Elements */}
        <div className="absolute inset-0 dot-pattern" style={{ opacity: 0.05 }}></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 opacity-20 blur-3xl animate-float" style={{ background: 'var(--saffron)' }}></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 opacity-20 blur-3xl animate-float" style={{ background: 'var(--terracotta)', animationDelay: '2s' }}></div>

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 animate-fade-in-up"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Bereit für frische <span className="text-gradient-warm">Deals</span>?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Werde Teil unserer Community und verpasse nie wieder ein Angebot von deinem Lieblingsmarkt.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <button
              className="btn-primary px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl inline-flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Kostenlos registrieren
            </button>
            <button
              className="px-10 py-5 rounded-2xl font-bold text-lg border-2 border-white/30 text-white hover:bg-white/10 transition-all inline-flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Für Shop-Besitzer
            </button>
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {[
              { value: '50+', label: 'Partner-Shops' },
              { value: '10K+', label: 'Aktive Nutzer' },
              { value: '247', label: 'Angebote heute' },
              { value: '4.9★', label: 'Bewertung' }
            ].map((stat, idx) => (
              <div key={idx} className="glass-card p-6 hover-scale cursor-default" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                <div className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'var(--font-playfair)' }}>{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
