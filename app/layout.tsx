import type { Metadata } from "next";
import { Playfair_Display, Outfit } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "./components/LayoutWrapper";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Bereket Market | Frische Angebote von lokalen Märkten",
  description: "Entdecke täglich neue Angebote von türkischen, iranischen, afghanischen und marokkanischen Shops in deiner Nähe. KI-gestützte Angebotserkennung via WhatsApp.",
  keywords: "Bereket, Market, türkische Lebensmittel, orientalische Spezialitäten, Angebote, Deals, Frankfurt, Berlin",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${playfair.variable} ${outfit.variable}`}>
      <body className="antialiased" style={{ fontFamily: 'var(--font-outfit)' }}>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}