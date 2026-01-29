import type { Metadata } from "next";
import { Playfair_Display, Outfit } from "next/font/google";
import "./globals.css";

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
  description: "Entdecke täglich neue Angebote von türkischen, iranischen, afghanischen und marokkanischen Shops in deiner Nähe.",
  icons: {
    icon: '/favicon.ico',
  },
};

// This is the root layout - we export the fonts as CSS variables
// The actual html/body is in the [locale]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

// Export font variables for use in other layouts
export { playfair, outfit };
