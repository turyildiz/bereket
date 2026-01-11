import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { LATEST_OFFERS } from './mock-data';

export default async function Home() {
  // Fetch premium markets from Supabase
  const supabase = await createClient();
  const { data: premiumMarkets } = await supabase
    .from('markets')
    .select('id, name, city, header_url, logo_url, about_text')
    .eq('is_premium', true)
    .order('name', { ascending: true });

  // Fetch newest markets (6 most recently created)
  const { data: newestMarkets } = await supabase
    .from('markets')
    .select('id, name, city, header_url, logo_url, about_text, is_premium')
    .order('created_at', { ascending: false })
    .limit(6);

  return (
    <main className="min-h-screen overflow-hidden">
      {/* Hero Section - Stunning Customer-Focused Design */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
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

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="relative flex-1 max-w-md">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2">
                    <svg className="w-6 h-6" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Deine Stadt oder Postleitzahl..."
                    className="w-full pl-14 pr-6 py-5 rounded-2xl text-lg font-medium focus:outline-none focus:ring-4 focus:ring-orange-200 shadow-2xl"
                    style={{
                      background: 'white',
                      color: 'var(--charcoal)'
                    }}
                  />
                </div>
                <button
                  className="btn-primary px-10 py-5 font-bold rounded-2xl text-lg shadow-2xl flex items-center justify-center gap-3 whitespace-nowrap"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Deals finden
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden"
                      >
                        <img
                          src={`https://images.unsplash.com/photo-${['1507003211169-0a1dd7228f2d', '1494790108377-be9c29b29330', '1500648767791-00dcc994a43e', '1534528741775-53994a69daeb', '1506794778202-cad84cf45f1d'][i]}?auto=format&fit=crop&w=100&h=100`}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="text-white">
                    <span className="font-black text-lg">10K+</span>
                    <span className="text-white/70 text-sm ml-1">Nutzer</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/30 hidden sm:block"></div>
                <div className="flex items-center gap-2 text-white">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className="w-5 h-5" fill="#FFD700" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="font-bold">4.9</span>
                  <span className="text-white/70 text-sm">(2.4K Bewertungen)</span>
                </div>
                <div className="h-8 w-px bg-white/30 hidden sm:block"></div>
                <div className="text-white">
                  <span className="font-black text-lg">50+</span>
                  <span className="text-white/70 text-sm ml-1">Märkte</span>
                </div>
              </div>
            </div>

            {/* Right Column - Floating Deal Cards - Takes 2 columns */}
            <div className="lg:col-span-2 hidden lg:flex justify-center items-center">
              <div className="relative">
                {/* Main Deal Card */}
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

                {/* Secondary Card */}
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
              href="/shops"
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
            {premiumMarkets.map((market, idx) => {
              // Truncate about_text to ~80 characters
              const teaser = market.about_text
                ? market.about_text.length > 80
                  ? market.about_text.substring(0, 80).trim() + '...'
                  : market.about_text
                : `Entdecken Sie ${market.name} – Ihr Premium-Markt für frische Spezialitäten.`;

              return (
                <Link
                  href={`/shop/${market.id}`}
                  key={market.id}
                  className="group relative rounded-3xl overflow-hidden cursor-pointer block animate-scale-in transition-transform duration-300 hover:scale-[1.03]"
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    background: 'white',
                    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={market.header_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'}
                      alt={market.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />

                    {/* Premium Badge - Top Right */}
                    <div className="absolute top-4 right-4 badge-premium cursor-default shadow-lg">
                      <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Premium Partner
                    </div>
                  </div>

                  {/* Content Section with Overlapping Logo */}
                  <div className="relative p-6 pt-10">
                    {/* Overlapping Logo - 60x60px, positioned half over image */}
                    <div
                      className="absolute -top-8 left-6 w-[60px] h-[60px] rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-white"
                      style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)' }}
                    >
                      {market.logo_url ? (
                        <img src={market.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white" style={{ background: 'var(--gradient-warm)' }}>
                          {market.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Market Name */}
                    <h3
                      className="font-bold text-xl mb-2 truncate"
                      style={{
                        fontFamily: 'var(--font-playfair)',
                        color: 'var(--charcoal)'
                      }}
                    >
                      {market.name}
                    </h3>

                    {/* Teaser Text */}
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--warm-gray)' }}>
                      {teaser}
                    </p>

                    {/* City with MapPin */}
                    <div
                      className="flex items-center justify-between pt-4 border-t"
                      style={{ borderColor: 'var(--sand)' }}
                    >
                      <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
                        <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {market.city}
                      </div>

                      {/* Arrow indicator */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--cream)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
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
              href="/shops"
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
            {newestMarkets.map((market, idx) => {
              // Truncate about_text to ~100 characters
              const teaser = market.about_text
                ? market.about_text.length > 100
                  ? market.about_text.substring(0, 100).trim() + '...'
                  : market.about_text
                : `Willkommen bei ${market.name} – Ihr neuer Markt für frische Spezialitäten.`;

              return (
                <Link
                  href={`/shop/${market.id}`}
                  key={market.id}
                  className="group relative rounded-3xl overflow-hidden cursor-pointer block animate-scale-in transition-transform duration-300 hover:scale-[1.03]"
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    background: 'white',
                    boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* Image Section */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={market.header_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600'}
                      alt={market.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />

                    {/* Smart Badge - Premium or NEU */}
                    {market.is_premium ? (
                      <div className="absolute top-4 right-4 badge-premium cursor-default shadow-lg">
                        <svg className="w-3 h-3 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Premium Partner
                      </div>
                    ) : (
                      <div className="absolute top-4 right-4 badge-new cursor-default shadow-lg">
                        <svg className="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Neu
                      </div>
                    )}
                  </div>

                  {/* Content Section with Overlapping Logo */}
                  <div className="relative p-6 pt-10">
                    {/* Overlapping Logo - 60x60px, positioned half over image */}
                    <div
                      className="absolute -top-8 left-6 w-[60px] h-[60px] rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-white"
                      style={{ boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)' }}
                    >
                      {market.logo_url ? (
                        <img src={market.logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white" style={{ background: 'var(--gradient-fresh)' }}>
                          {market.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Market Name */}
                    <h3
                      className="font-bold text-xl mb-2 truncate"
                      style={{
                        fontFamily: 'var(--font-playfair)',
                        color: 'var(--charcoal)'
                      }}
                    >
                      {market.name}
                    </h3>

                    {/* Teaser Text */}
                    <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--warm-gray)' }}>
                      {teaser}
                    </p>

                    {/* City with MapPin */}
                    <div
                      className="flex items-center justify-between pt-4 border-t"
                      style={{ borderColor: 'var(--sand)' }}
                    >
                      <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
                        <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {market.city}
                      </div>

                      {/* Arrow indicator */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" style={{ background: 'var(--mint)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest Offers Section - Enhanced */}
      <section
        className="relative py-20 sm:py-28 overflow-hidden grain-texture"
        style={{ background: 'linear-gradient(180deg, var(--cream) 0%, #F4E4D7 100%)' }}
      >
        {/* Decorative Background */}
        <div className="absolute top-20 right-0 w-96 h-96 opacity-10 blur-3xl animate-float" style={{ background: 'var(--saffron)' }}></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 opacity-10 blur-3xl animate-float" style={{ background: 'var(--terracotta)', animationDelay: '3s' }}></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{ background: 'white', color: 'var(--terracotta)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--terracotta)' }}></span>
                <span className="text-sm font-bold">Live-Updates</span>
              </div>
              <h2
                className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
              >
                Neueste Angebote
              </h2>
              <p className="text-lg sm:text-xl" style={{ color: 'var(--warm-gray)' }}>
                KI-erkannte Deals, frisch für dich.
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-3">
              <select
                className="rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none cursor-pointer shadow-lg hover-scale"
                style={{
                  background: 'white',
                  color: 'var(--charcoal)',
                  border: '2px solid var(--sand)'
                }}
              >
                <option>🗺️ Alle Städte</option>
                <option>📍 Frankfurt</option>
                <option>📍 Berlin</option>
                <option>📍 München</option>
              </select>
              <select
                className="rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none cursor-pointer shadow-lg hover-scale"
                style={{
                  background: 'white',
                  color: 'var(--charcoal)',
                  border: '2px solid var(--sand)'
                }}
              >
                <option>🏷️ Alle Kategorien</option>
                <option>🥬 Gemüse</option>
                <option>🍖 Fleisch</option>
                <option>🧀 Milchprodukte</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {LATEST_OFFERS.slice(0, 6).map((offer, idx) => (
              <div
                key={offer.id}
                className="group relative rounded-3xl overflow-hidden cursor-pointer hover-lift animate-scale-in"
                style={{
                  background: 'white',
                  boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
                  animationDelay: `${idx * 0.05}s`
                }}
              >
                {/* Image - Clean, no overlays */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={offer.image}
                    alt={offer.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Product Name */}
                  <h3
                    className="font-bold text-xl mb-2"
                    style={{
                      fontFamily: 'var(--font-playfair)',
                      color: 'var(--charcoal)'
                    }}
                  >
                    {offer.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm mb-4" style={{ color: 'var(--warm-gray)' }}>
                    Frisch eingetroffen bei {offer.market}. Täglich neue Angebote verfügbar.
                  </p>

                  {/* Price and Market Info */}
                  <div
                    className="flex items-center justify-between pt-4 border-t"
                    style={{ borderColor: 'var(--sand)' }}
                  >
                    {/* Price */}
                    <span
                      className="text-2xl font-black"
                      style={{ color: 'var(--terracotta)' }}
                    >
                      {offer.price}
                    </span>

                    {/* Market Badge */}
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--gradient-warm)' }}>
                        {offer.market.charAt(0)}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
                        {offer.market}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          <div className="mt-16 text-center">
            <button
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
              style={{
                background: 'var(--gradient-warm)',
                color: 'white'
              }}
            >
              Mehr Angebote laden
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

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
