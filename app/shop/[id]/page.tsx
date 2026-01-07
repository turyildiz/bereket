import { FEATURED_SHOPS, LATEST_OFFERS } from '../../mock-data';
import { notFound } from 'next/navigation';

// Wir fügen "async" vor die Funktion und definieren params als Promise
export default async function ShopProfile({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Hier "entpacken" wir die ID aus den Parametern
  const { id } = await params;
  
  // Wir suchen den Shop anhand der ID
  const shop = FEATURED_SHOPS.find(s => s.id === parseInt(id));

  // Wenn der Shop nicht existiert, zeigen wir eine 404 Seite
  if (!shop) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Filial-Header */}
      <div className="relative h-64 sm:h-80 lg:h-96 w-full">
        <img 
          src={shop.image} 
          alt={shop.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 text-white">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-end gap-6">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-2xl shadow-xl p-2 shrink-0">
               <div className="w-full h-full bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800 font-bold text-2xl">
                {shop.name.charAt(0)}
               </div>
            </div>
            <div className="mb-2">
              <h1 className="text-3xl sm:text-5xl font-black">{shop.name}</h1>
              <p className="text-lg sm:text-xl font-medium text-emerald-50">{shop.branch}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filial-Infos & Angebote */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Linke Spalte: Infos */}
          <div className="space-y-8">
            <div className="bg-stone-50 rounded-3xl p-8 border border-stone-100">
              <h2 className="text-xl font-bold text-emerald-900 mb-6">Filial-Informationen</h2>
              <div className="space-y-4 text-stone-600">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-700 font-bold text-lg">📍</span>
                  <p>Musterstraße 123,<br />60311 Frankfurt am Main</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 font-bold text-lg">📞</span>
                  <p>+49 69 1234567</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 font-bold text-lg">⏰</span>
                  <p>Mo - Sa: 08:00 - 20:00 Uhr</p>
                </div>
              </div>
              <button className="w-full mt-8 bg-white border border-stone-200 py-3 rounded-xl font-bold text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors">
                Auf Karte zeigen
              </button>
            </div>
          </div>

          {/* Rechte Spalte: Angebote */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-emerald-900 mb-8">Aktuelle Angebote dieser Filiale</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {LATEST_OFFERS.filter(o => o.market === shop.name).map((offer) => (
                <div key={offer.id} className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-sm group">
                  <div className="aspect-square overflow-hidden relative">
                    <img src={offer.image} alt={offer.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 left-4">
                      <span className="bg-emerald-800 text-white text-lg font-black px-4 py-2 rounded-xl">
                        {offer.price}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-xl text-stone-900">{offer.name}</h3>
                    <p className="text-sm text-stone-500 mt-2">Frisch in dieser Filiale eingetroffen.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </main>
  );
}