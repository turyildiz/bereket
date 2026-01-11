import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ShopShareButton from './ShopShareButton';

// Helper to format currency
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price);
};

export default async function ShopProfile({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Market Data
  const { data: market, error } = await supabase
    .from('markets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !market) {
    return notFound();
  }

  // 2. Fetch Market Offers
  const { data: offers } = await supabase
    .from('offers')
    .select('*')
    .eq('market_id', id)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  // 3. Fetch Similar Markets
  const { data: similarMarkets } = await supabase
    .from('markets')
    .select('id, name, city, header_url, logo_url')
    .neq('id', id)
    .limit(3);

  // Data Mapping & Defaults
  const features = market.features || [];

  // Safe parsing for opening hours
  let openingHours: { day: string; time: string }[] = [];
  if (Array.isArray(market.opening_hours)) {
    openingHours = market.opening_hours;
  } else {
    openingHours = [
      { day: 'Montag - Freitag', time: '08:00 - 20:00' },
      { day: 'Samstag', time: '08:00 - 18:00' },
      { day: 'Sonntag', time: 'Geschlossen' }
    ];
  }

  // Determine if open now (Simple Mock Logic)
  const isOpenNow = true;

  // Build Maps URL properly
  const mapsUrl = market.latitude && market.longitude
    ? `https://www.google.com/maps?q=${market.latitude},${market.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(market.full_address || `${market.name}, ${market.city}`)}`;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      {/* ========== BREADCRUMBS (Above Hero) ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
          <Link href="/" className="hover:text-[var(--charcoal)] transition-colors cursor-pointer">Home</Link>
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/shops" className="hover:text-[var(--charcoal)] transition-colors cursor-pointer">Märkte</Link>
          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[var(--charcoal)] truncate max-w-[200px]">{market.name}</span>
        </nav>
      </div>

      {/* ========== HERO SECTION ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-[280px] md:h-[320px] lg:h-[380px] w-full rounded-2xl overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={market.header_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920'}
              alt={market.name}
              className="w-full h-full object-cover"
            />
            {/* Dark-to-transparent gradient at the bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          </div>

          {/* Share Button - Top Right */}
          <div className="absolute top-4 right-4 z-20">
            <ShopShareButton />
          </div>

          {/* Hero Content: Shop Name + Badges */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 md:p-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 drop-shadow-lg"
              style={{ fontFamily: 'var(--font-playfair)', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
              {market.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              {market.is_premium && (
                <span className="badge-premium flex items-center gap-1.5 cursor-default shadow-lg">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Premium Partner
                </span>
              )}
              {isOpenNow && (
                <span className="badge-new flex items-center gap-1.5 cursor-default shadow-lg">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                  Jetzt geöffnet
                </span>
              )}
              <span className="flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {market.city}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT: 2-Column Grid ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-8 lg:gap-12">

          {/* ========== LEFT COLUMN: Sticky Sidebar ========== */}
          <aside className="md:sticky md:top-8 md:self-start space-y-6">

            {/* Logo Card */}
            <div
              className="glass-card p-6 shadow-xl animate-fade-in-up flex flex-col items-center"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)'
              }}
            >
              <div className="w-[120px] h-[120px] rounded-full border-4 border-white shadow-xl bg-white overflow-hidden flex items-center justify-center mb-4"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                {market.logo_url ? (
                  <img src={market.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white"
                    style={{ background: 'var(--gradient-warm)', fontFamily: 'var(--font-playfair)' }}>
                    {market.name.charAt(0)}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-center" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                {market.name}
              </h2>
              <p className="text-sm text-center mt-1" style={{ color: 'var(--warm-gray)' }}>
                {market.city}
              </p>
            </div>

            {/* Contact Information Card */}
            <div
              className="glass-card p-6 shadow-xl animate-fade-in-up"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                animationDelay: '0.1s'
              }}
            >
              <h2
                className="text-xl font-bold mb-5 flex items-center gap-2"
                style={{
                  fontFamily: 'var(--font-playfair)',
                  color: 'var(--charcoal)'
                }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Kontakt & Info
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--cream)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>Adresse</p>
                    <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                      {market.full_address || `${market.name}, ${market.city}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--cream)' }}
                  >
                    <svg className="w-5 h-5" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>Telefon (Kundenkontakt)</p>
                    <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                      {market.customer_phone || 'Keine Nummer angegeben'}
                    </p>
                  </div>
                </div>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-4 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    background: 'var(--gradient-warm)',
                    color: 'white'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Auf Karte zeigen
                </a>
              </div>
            </div>

            {/* Opening Hours */}
            <div
              className="glass-card p-6 shadow-xl animate-fade-in-up"
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                animationDelay: '0.2s'
              }}
            >
              <h3
                className="text-xl font-bold mb-4 flex items-center gap-2"
                style={{
                  fontFamily: 'var(--font-playfair)',
                  color: 'var(--charcoal)'
                }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Öffnungszeiten
              </h3>
              <ul className="space-y-2">
                {openingHours.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--charcoal)' }}>{item.day}</span>
                    <span className="font-semibold" style={{ color: item.time === 'Geschlossen' ? 'var(--terracotta)' : 'var(--cardamom)' }}>{item.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            {features.length > 0 && (
              <div
                className="glass-card p-6 shadow-xl animate-fade-in-up"
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  animationDelay: '0.3s'
                }}
              >
                <h3
                  className="text-xl font-bold mb-4 flex items-center gap-2"
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    color: 'var(--charcoal)'
                  }}
                >
                  <svg className="w-5 h-5" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Besonderheiten
                </h3>
                <ul className="space-y-2">
                  {features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--warm-gray)' }}>
                      <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* About Section */}
            <div
              className="glass-card p-6 shadow-xl animate-fade-in-up"
              style={{
                background: 'linear-gradient(135deg, rgba(250, 247, 242, 0.9) 0%, rgba(255, 255, 255, 0.85) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                animationDelay: '0.4s'
              }}
            >
              <h3
                className="text-xl font-bold mb-3 flex items-center gap-2"
                style={{
                  fontFamily: 'var(--font-playfair)',
                  color: 'var(--charcoal)'
                }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Über uns
              </h3>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--warm-gray)' }}>
                {market.about_text || `Willkommen bei ${market.name}! Wir bieten Ihnen täglich frische Spezialitäten und authentische Produkte aus der Region. Besuchen Sie uns und entdecken Sie die Vielfalt unseres Sortiments.`}
              </p>
            </div>
          </aside>

          {/* ========== RIGHT COLUMN: Offers ========== */}
          <div className="min-w-0">
            {/* Offers Header */}
            <div className="mb-8 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2
                    className="text-2xl sm:text-3xl font-bold mb-2"
                    style={{
                      fontFamily: 'var(--font-playfair)',
                      color: 'var(--charcoal)'
                    }}
                  >
                    Aktuelle Angebote
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                    {offers && offers.length > 0 ? `${offers.length} Angebote verfügbar` : 'Keine aktuellen Angebote'}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold cursor-default"
                  style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', color: 'var(--warm-gray)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--cardamom)' }}></span>
                  KI-aktualisiert
                </div>
              </div>
            </div>

            {/* Offers Grid */}
            {offers && offers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {offers.map((offer, idx) => (
                  <div
                    key={offer.id || idx}
                    className="group relative rounded-3xl overflow-hidden cursor-pointer hover-lift animate-scale-in"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.5)',
                      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                      animationDelay: `${0.1 + idx * 0.1}s`
                    }}
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={offer.image_url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=400'}
                        alt={offer.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3
                        className="font-bold text-xl mb-2"
                        style={{
                          fontFamily: 'var(--font-playfair)',
                          color: 'var(--charcoal)'
                        }}
                      >
                        {offer.product_name}
                      </h3>

                      <p className="text-sm mb-4" style={{ color: 'var(--warm-gray)' }}>
                        {offer.expires_at ? `Gültig bis ${new Date(offer.expires_at).toLocaleDateString('de-DE')}` : 'Nur solange Vorrat reicht.'}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                        <span
                          className="text-2xl font-black"
                          style={{ color: 'var(--terracotta)' }}
                        >
                          {typeof offer.price === 'number' ? formatPrice(offer.price) : offer.price}
                        </span>
                        <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'var(--mint)', color: 'var(--cardamom)' }}>
                          Verfügbar
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State - Glassmorphism Card */
              <div
                className="text-center py-16 px-8 rounded-3xl animate-fade-in-up"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
                }}
              >
                <div
                  className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-3xl shadow-lg"
                  style={{ background: 'var(--gradient-warm)' }}
                >
                  📦
                </div>
                <h3
                  className="text-2xl font-bold mb-3"
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    color: 'var(--charcoal)'
                  }}
                >
                  Keine Angebote verfügbar
                </h3>
                <p className="mb-6 text-lg" style={{ color: 'var(--warm-gray)' }}>
                  Schauen Sie bald wieder vorbei!
                </p>
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 cursor-pointer"
                  style={{ background: 'var(--charcoal)', color: 'white' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Benachrichtigung aktivieren
                </button>
              </div>
            )}

            {/* Similar Shops Section */}
            {similarMarkets && similarMarkets.length > 0 && (
              <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <h3
                  className="text-xl font-bold mb-6"
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    color: 'var(--charcoal)'
                  }}
                >
                  Ähnliche Märkte in der Nähe
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {similarMarkets.map((otherShop) => (
                    <Link
                      key={otherShop.id}
                      href={`/shop/${otherShop.id}`}
                      className="group rounded-2xl overflow-hidden shadow-lg hover-scale block cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.5)'
                      }}
                    >
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={otherShop.header_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'}
                          alt={otherShop.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        {/* Mini logo overlay */}
                        {otherShop.logo_url && (
                          <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full border-2 border-white shadow overflow-hidden">
                            <img src={otherShop.logo_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-sm truncate" style={{ color: 'var(--charcoal)' }}>{otherShop.name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--warm-gray)' }}>{otherShop.city}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
