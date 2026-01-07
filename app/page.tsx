import { FEATURED_SHOPS, LATEST_OFFERS } from './mock-data';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section - Background Image with Reduced Height */}
      <section className="relative bg-stone-50/50 overflow-hidden border-b border-stone-200">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=2000"
            alt="Markt Hintergrund"
            className="w-full h-full object-cover opacity-[0.10] saturate-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-transparent to-stone-50/80"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-28 text-center">
          <div className="inline-flex items-center rounded-full bg-white/80 backdrop-blur-sm px-4 py-1.5 text-xs sm:text-sm font-semibold text-emerald-800 border border-emerald-100 mb-8 shadow-sm">
            <span className="mr-2">✨</span> KI-gestützte Angebotserkennung
          </div>
          
          <h1 className="text-4xl font-black tracking-tight text-stone-900 sm:text-6xl lg:text-7xl leading-[1.1] drop-shadow-sm">
            Ihr lokaler Marktplatz <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-600 bg-clip-text text-transparent">
              für orientalische Spezialitäten
            </span>
          </h1>
          
          <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-stone-700 font-medium leading-relaxed px-4">
            Shop owners simply send a photo via WhatsApp—our AI handles the rest[cite: 6, 7]. 
            Discover daily offers from Turkish, Iranian, Afghan, and Moroccan shops in your neighborhood[cite: 3, 10, 12].
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 px-10 sm:px-0">
            <button className="w-full sm:w-auto rounded-xl bg-emerald-800 px-10 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-900 hover:-translate-y-0.5 transition-all cursor-pointer">
              Jetzt registrieren →
            </button>
            <button className="w-full sm:w-auto rounded-xl border-2 border-stone-200 bg-white/80 backdrop-blur-sm px-10 py-4 text-lg font-bold text-stone-900 hover:bg-white hover:border-stone-300 transition-all cursor-pointer shadow-sm">
              Märkte entdecken
            </button>
          </div>
          
          <p className="mt-8 text-sm text-stone-500 font-semibold">
            Already over 50 markets in Frankfurt and Berlin participating[cite: 3].
          </p>
        </div>
      </section>

      {/* Featured Shops Section (6 Cards) */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-900 tracking-tight">Empfohlene Shops</h2>
          <p className="text-stone-500 mt-3 text-lg">The most popular markets in your region[cite: 9, 12].</p>
        </div>
        
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_SHOPS.map((shop) => (
            <Link 
              href={`/shop/${shop.id}`} 
              key={shop.id} 
              className="group rounded-3xl border border-stone-100 bg-white p-3 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer block"
            >
              <div className="h-56 sm:h-64 rounded-2xl bg-stone-100 mb-5 overflow-hidden relative">
                <img src={shop.image} alt={shop.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-emerald-900 shadow-sm">
                  Premium Partner
                </div>
              </div>
              <div className="px-4 pb-4">
                <h3 className="font-bold text-xl text-stone-900">{shop.name}</h3>
                <p className="text-stone-500 font-medium flex items-center gap-1 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {shop.branch}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Offers Section (9 Cards) */}
      <section className="bg-stone-50 py-20 border-t border-stone-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-900 tracking-tight">Neueste Angebote</h2>
              <p className="text-stone-500 mt-2">AI-detected offers, ready for you[cite: 7, 12].</p>
            </div>
            <div className="flex justify-center">
              <select className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm">
                <option>🗺️ Alle Städte</option>
                <option>📍 Frankfurt</option>
                <option>📍 Berlin</option>
                <option>📍 München</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {LATEST_OFFERS.map((offer) => (
              <div key={offer.id} className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all duration-300 group">
                <div className="aspect-square overflow-hidden relative">
                  <img src={offer.image} alt={offer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-emerald-800 text-white text-lg font-black px-4 py-2 rounded-xl shadow-lg">
                      {offer.price}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-xl text-stone-900 mb-2">{offer.name}</h3>
                  <p className="text-sm text-stone-500 line-clamp-2 mb-6 leading-relaxed font-medium">
                    Automated description generated by AI from the shop's offer[cite: 7, 12].
                  </p>
                  <div className="flex items-center justify-between border-t border-stone-100 pt-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1" />
                      </svg>
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{offer.market}</span>
                    </div>
                    <span className="text-emerald-700 text-sm font-bold group-hover:translate-x-1 transition-transform">Details →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-16 flex items-center justify-center gap-3">
            <button className="h-12 w-12 flex items-center justify-center rounded-xl border border-stone-200 bg-white cursor-pointer hover:bg-stone-50 transition-colors">«</button>
            <button className="h-12 w-12 flex items-center justify-center rounded-xl bg-emerald-800 text-white font-bold cursor-pointer shadow-lg shadow-emerald-900/20">1</button>
            <button className="h-12 w-12 flex items-center justify-center rounded-xl border border-stone-200 bg-white cursor-pointer hover:bg-stone-50 transition-colors">2</button>
            <button className="h-12 w-12 flex items-center justify-center rounded-lg border border-stone-200 bg-white cursor-pointer hover:bg-stone-50 transition-colors">»</button>
          </div>
        </div>
      </section>
    </main>
  );
}