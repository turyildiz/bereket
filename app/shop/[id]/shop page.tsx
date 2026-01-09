import { FEATURED_SHOPS, LATEST_OFFERS } from '../../mock-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function ShopProfile({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const shop = FEATURED_SHOPS.find(s => s.id === parseInt(id));

  if (!shop) {
    return notFound();
  }

  const shopOffers = LATEST_OFFERS.filter(o => o.market === shop.name);

  // Mock data for shop details
  const shopDetails = {
    rating: 4.8,
    reviewCount: 127,
    openNow: true,
    categories: ['Obst & Gemüse', 'Fleisch', 'Gewürze', 'Backwaren'],
    hours: [
      { day: 'Montag - Freitag', time: '08:00 - 20:00' },
      { day: 'Samstag', time: '08:00 - 18:00' },
      { day: 'Sonntag', time: 'Geschlossen' },
    ],
    features: ['Frische Backwaren', 'Halal-zertifiziert', 'Regionale Produkte', 'Parkmöglichkeit'],
  };

  return (
    <main className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-[var(--cream)] border-b" style={{ borderColor: 'var(--sand)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--warm-gray)' }}>
              Home
            </Link>
            <svg className="w-4 h-4" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/shops" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--warm-gray)' }}>
              Märkte
            </Link>
            <svg className="w-4 h-4" style={{ color: 'var(--warm-gray)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-semibold" style={{ color: 'var(--charcoal)' }}>{shop.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Header with Shop Image */}
      <div className="relative h-72 sm:h-80 lg:h-96 w-full overflow-hidden">
        <img
          src={shop.image}
          alt={shop.name}
          className="w-full h-full object-cover"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(44, 40, 35, 0.9) 0%, rgba(44, 40, 35, 0.4) 40%, transparent 100%)' }}></div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-20 blur-3xl" style={{ background: 'var(--saffron)' }}></div>

        {/* Shop Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              {/* Shop Logo/Avatar */}
              <div
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl p-2 shrink-0 animate-scale-in -mb-12 sm:-mb-14 z-10"
                style={{ background: 'white' }}
              >
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-3xl sm:text-4xl font-black"
                  style={{
                    background: 'var(--gradient-warm)',
                    color: 'white',
                    fontFamily: 'var(--font-playfair)'
                  }}
                >
                  {shop.name.charAt(0)}
                </div>
              </div>

              {/* Shop Name & Location */}
              <div className="flex-1 sm:pl-32 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1
                    className="text-3xl sm:text-4xl lg:text-5xl font-black text-white"
                    style={{ fontFamily: 'var(--font-playfair)' }}
                  >
                    {shop.name}
                  </h1>
                  {shopDetails.openNow && (
                    <span className="badge-new flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Jetzt geöffnet
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {shop.branch}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--saffron)' }}>★</span>
                    <span className="font-bold">{shopDetails.rating}</span>
                    <span className="text-white/70">({shopDetails.reviewCount} Bewertungen)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Category Tags */}
        <div className="flex flex-wrap gap-2 mb-8 mt-8 sm:mt-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          {shopDetails.categories.map((category, idx) => (
            <span
              key={idx}
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: 'var(--cream)', color: 'var(--warm-gray)', border: '1px solid var(--sand)' }}
            >
              {category}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

          {/* Left Column: Shop Info */}
          <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {/* Contact Information Card */}
            <div
              className="relative overflow-hidden rounded-3xl p-6 shadow-lg"
              style={{
                background: 'white',
                border: '2px solid var(--sand)'
              }}
            >
              {/* Decorative Element */}
              <div
                className="absolute top-0 right-0 w-24 h-24 opacity-10 rounded-bl-full"
                style={{ background: 'var(--gradient-warm)' }}
              ></div>

              <h2
                className="relative text-xl font-bold mb-5 flex items-center gap-2"
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

              <div className="relative space-y-4">
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
                      Musterstraße 123<br />
                      60311 Frankfurt am Main
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
                    <p className="font-semibold text-sm" style={{ color: 'var(--charcoal)' }}>Telefon</p>
                    <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>+49 69 1234567</p>
                  </div>
                </div>

                <button
                  className="w-full mt-4 py-3 rounded-xl font-bold transition-all hover:scale-[1.02] shadow-md text-sm flex items-center justify-center gap-2"
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
                </button>
              </div>
            </div>

            {/* Opening Hours */}
            <div
              className="rounded-3xl p-6 shadow-lg"
              style={{
                background: 'white',
                border: '2px solid var(--sand)'
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
                {shopDetails.hours.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--charcoal)' }}>{item.day}</span>
                    <span className="font-semibold" style={{ color: item.time === 'Geschlossen' ? 'var(--terracotta)' : 'var(--cardamom)' }}>{item.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div
              className="rounded-3xl p-6 shadow-lg"
              style={{
                background: 'white',
                border: '2px solid var(--sand)'
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
                {shopDetails.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm" style={{ color: 'var(--warm-gray)' }}>
                    <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* About Section */}
            <div
              className="rounded-3xl p-6 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--cream) 0%, white 100%)',
                border: '2px solid var(--sand)'
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
                Willkommen bei {shop.name}! Seit über 20 Jahren bieten wir Ihnen täglich frische orientalische Spezialitäten und authentische Produkte aus der Region. Besuchen Sie uns und entdecken Sie die Vielfalt unseres Sortiments.
              </p>
            </div>
          </div>

          {/* Right Column: Offers */}
          <div className="lg:col-span-2">
            <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
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
                    {shopOffers.length > 0 ? `${shopOffers.length} Angebote verfügbar` : 'Keine aktuellen Angebote'}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{ background: 'var(--cream)', color: 'var(--warm-gray)' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--cardamom)' }}></span>
                  KI-aktualisiert
                </div>
              </div>
            </div>

            {shopOffers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {shopOffers.map((offer, idx) => (
                  <div
                    key={offer.id}
                    className="group relative rounded-3xl overflow-hidden cursor-pointer hover-lift animate-scale-in"
                    style={{
                      background: 'white',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      animationDelay: `${0.5 + idx * 0.1}s`
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
                    <div className="p-5">
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
                        Frisch in dieser Filiale eingetroffen. Nur solange Vorrat reicht.
                      </p>

                      {/* Price */}
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                        <span
                          className="text-2xl font-black"
                          style={{ color: 'var(--terracotta)' }}
                        >
                          {offer.price}
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
              <div
                className="text-center py-16 rounded-3xl animate-fade-in-up"
                style={{ background: 'var(--cream)', animationDelay: '0.5s' }}
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
                <p className="mb-6" style={{ color: 'var(--warm-gray)' }}>
                  Schauen Sie bald wieder vorbei für neue Angebote!
                </p>
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
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
            <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
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
                {FEATURED_SHOPS.filter(s => s.id !== shop.id).slice(0, 3).map((otherShop) => (
                  <Link
                    key={otherShop.id}
                    href={`/shop/${otherShop.id}`}
                    className="group rounded-2xl overflow-hidden shadow-md hover-scale block"
                    style={{ background: 'white' }}
                  >
                    <div className="relative h-28 overflow-hidden">
                      <img
                        src={otherShop.image}
                        alt={otherShop.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--charcoal)' }}>{otherShop.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--warm-gray)' }}>{otherShop.branch}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <section
        className="relative overflow-hidden py-16 mt-8 grain-texture"
        style={{ background: 'linear-gradient(135deg, var(--burgundy) 0%, var(--terracotta) 100%)' }}
      >
        {/* Decorative Blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 opacity-20 blur-3xl animate-float" style={{ background: 'var(--saffron)' }}></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 opacity-20 blur-3xl animate-float" style={{ background: 'var(--burgundy-dark)', animationDelay: '2s' }}></div>

        <div className="relative max-w-4xl mx-auto text-center px-4">
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Verpassen Sie keine Angebote mehr!
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Aktivieren Sie Benachrichtigungen für {shop.name} und erhalten Sie exklusive Angebote direkt auf Ihr Handy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
            <input
              type="email"
              placeholder="Ihre E-Mail Adresse"
              className="flex-1 px-6 py-4 rounded-xl text-base focus:outline-none focus:ring-4 focus:ring-white/30"
              style={{ color: 'var(--charcoal)' }}
            />
            <button
              className="px-8 py-4 rounded-xl font-bold text-base shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
              style={{
                background: 'white',
                color: 'var(--burgundy)'
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Benachrichtigen
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
