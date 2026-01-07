import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bereket Market | Frische Angebote in deiner Nähe",
  description: "Entdecke tägliche Angebote von türkischen und orientalischen Märkten in deiner Stadt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-stone-50 text-stone-900 antialiased`}>
        {/* Navigation Bar - Responsive Optimized */}
        <nav className="border-b bg-white sticky top-0 z-50 overflow-x-hidden">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer shrink-0">
              <div className="bg-emerald-800 p-1.5 rounded-lg text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              <span className="text-lg sm:text-xl font-bold text-emerald-900 truncate">Bereket Market</span>
            </div>
            
            {/* Desktop & Mobile Actions */}
            <div className="flex items-center gap-2 sm:gap-6">
              <button className="hidden sm:block text-sm font-medium text-stone-600 hover:text-emerald-800 cursor-pointer">Märkte finden</button>
              <button className="text-sm font-medium text-stone-600 hover:text-emerald-800 cursor-pointer">Anmelden</button>
              <button className="rounded-lg bg-emerald-800 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-emerald-900 cursor-pointer transition-colors shrink-0">
                Registrieren
              </button>
            </div>
          </div>
        </nav>

        {children}

        {/* Footer - Stacked on mobile */}
        <footer className="bg-white border-t mt-12 sm:mt-20 py-10 sm:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center sm:text-left">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
              <div className="flex flex-col items-center sm:items-start">
                <h3 className="font-bold text-emerald-900 mb-4 text-lg">Bereket Market</h3>
                <p className="text-stone-500 leading-relaxed max-w-xs">
                  Ihr lokaler Marktplatz für orientalische Spezialitäten und tägliche Angebote.
                </p>
              </div>
              <div className="flex flex-col items-center sm:items-start">
                <h4 className="font-semibold mb-4 text-stone-900">Plattform</h4>
                <ul className="space-y-3 text-stone-600">
                  <li className="hover:text-emerald-800 cursor-pointer">Für Shopbesitzer</li>
                  <li className="hover:text-emerald-800 cursor-pointer">Alle Märkte</li>
                  <li className="hover:text-emerald-800 cursor-pointer">Hilfe & Support</li>
                </ul>
              </div>
              <div className="flex flex-col items-center sm:items-start">
                <h4 className="font-semibold mb-4 text-stone-900">Rechtliches</h4>
                <ul className="space-y-3 text-stone-600">
                  <li className="hover:text-emerald-800 cursor-pointer">Impressum</li>
                  <li className="hover:text-emerald-800 cursor-pointer">Datenschutz</li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}