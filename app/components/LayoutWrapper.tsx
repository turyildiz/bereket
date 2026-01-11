'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

interface LayoutWrapperProps {
    children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navLinks = [
        { href: '/shops', label: 'Alle Märkte' },
        { href: '/offers', label: 'Angebote' },
        { href: '/how-it-works', label: "So funktioniert's" },
        { href: '/for-shops', label: 'Für Shops' },
    ];

    return (
        <>
            {/* Navigation Bar - Hidden on Admin Routes */}
            {!isAdminRoute && (
                <nav className="sticky top-0 z-50 overflow-x-hidden backdrop-blur-xl border-b transition-all" style={{ background: 'rgba(250, 247, 242, 0.85)', borderColor: 'var(--sand)' }}>
                    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 cursor-pointer shrink-0 hover:opacity-90 transition-opacity group">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--saffron)] to-[var(--terracotta)] rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                <div className="relative bg-gradient-to-br from-[var(--saffron)] to-[var(--terracotta)] p-2.5 rounded-2xl text-white shadow-lg group-hover:scale-105 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl sm:text-2xl font-bold leading-tight" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Bereket Market
                                </span>
                                <span className="text-xs font-medium hidden sm:block" style={{ color: 'var(--warm-gray)' }}>
                                    Lokale Deals, digital entdeckt
                                </span>
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center gap-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-sm font-semibold transition-colors hover:opacity-70"
                                    style={{ color: 'var(--warm-gray)' }}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        {/* Actions - Hidden on mobile, only hamburger shown */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            <button className="hidden lg:flex items-center gap-2 text-sm font-semibold hover:opacity-70 transition-opacity cursor-pointer" style={{ color: 'var(--warm-gray)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Suchen
                            </button>
                            <button className="hidden lg:block text-sm font-semibold hover:opacity-70 transition-opacity cursor-pointer" style={{ color: 'var(--warm-gray)' }}>
                                Anmelden
                            </button>
                            <button className="hidden lg:block rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all shrink-0 cursor-pointer" style={{ background: 'var(--gradient-warm)' }}>
                                Registrieren
                            </button>

                            {/* Mobile Menu Button (Hamburger) - Only element visible on mobile */}
                            <button
                                className="lg:hidden p-2 rounded-xl hover:bg-[var(--sand)] transition-colors cursor-pointer"
                                style={{ color: 'var(--charcoal)' }}
                                onClick={() => setMobileMenuOpen(true)}
                                aria-label="Menü öffnen"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </nav>
            )}

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Slide-out Menu Panel */}
                    <div
                        className="absolute right-0 top-0 h-full w-[85%] max-w-sm shadow-2xl animate-slide-in-right"
                        style={{ background: 'var(--cream)' }}
                    >
                        {/* Close Button */}
                        <div className="flex justify-end p-4">
                            <button
                                className="p-2 rounded-xl hover:bg-[var(--sand)] transition-colors cursor-pointer"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Menü schließen"
                                style={{ color: 'var(--charcoal)' }}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Navigation Links */}
                        <div className="px-6 py-4 space-y-2">
                            {/* Suchen Button */}
                            <button
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-lg font-semibold transition-colors hover:bg-[var(--sand)] text-left cursor-pointer"
                                style={{ color: 'var(--charcoal)' }}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Suchen
                            </button>

                            {/* Main Nav Links */}
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="block px-4 py-3 rounded-xl text-lg font-semibold transition-colors hover:bg-[var(--sand)]"
                                    style={{ color: 'var(--charcoal)' }}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="mx-6 my-4 border-t" style={{ borderColor: 'var(--sand)' }} />

                        {/* Auth Actions */}
                        <div className="px-6 space-y-3">
                            <button
                                className="w-full px-4 py-3 rounded-xl text-lg font-semibold transition-colors hover:bg-[var(--sand)] text-left cursor-pointer"
                                style={{ color: 'var(--charcoal)' }}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Anmelden
                            </button>
                            <button
                                className="w-full px-6 py-4 rounded-xl font-bold text-white shadow-lg text-center cursor-pointer"
                                style={{ background: 'var(--gradient-warm)' }}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Registrieren
                            </button>
                        </div>

                        {/* Decorative Element */}
                        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--sand), transparent)' }} />
                    </div>
                </div>
            )}

            {children}

            {/* Footer - Hidden on Admin Routes */}
            {!isAdminRoute && (
                <footer className="relative overflow-hidden border-t" style={{ background: 'var(--gradient-night)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 opacity-10 blur-3xl" style={{ background: 'var(--saffron)' }}></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 opacity-10 blur-3xl" style={{ background: 'var(--terracotta)' }}></div>

                    {/* Main Footer Content */}
                    <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

                            {/* Brand Column */}
                            <div className="lg:col-span-1">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-gradient-to-br from-[var(--saffron)] to-[var(--terracotta)] p-2.5 rounded-2xl text-white shadow-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                        </svg>
                                    </div>
                                    <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-playfair)' }}>
                                        Bereket Market
                                    </span>
                                </div>
                                <p className="leading-relaxed text-white/70 mb-6">
                                    Dein lokaler Marktplatz für orientalische Spezialitäten. KI-gestützt, Community-getrieben.
                                </p>

                                {/* Social Icons */}
                                <div className="flex gap-3">
                                    {[
                                        { icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z', label: 'Facebook' },
                                        { icon: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z', label: 'Instagram' },
                                        { icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z', label: 'WhatsApp' },
                                    ].map((social, idx) => (
                                        <button
                                            key={idx}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                                            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                                            aria-label={social.label}
                                        >
                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d={social.icon} />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h4 className="font-bold mb-5 text-base text-white">Entdecken</h4>
                                <ul className="space-y-3">
                                    {['Alle Märkte', 'Aktuelle Angebote', 'Neue Shops', 'In deiner Nähe'].map((item, idx) => (
                                        <li key={idx}>
                                            <Link href="#" className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-2 group">
                                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                                <span className="group-hover:translate-x-1 transition-transform">{item}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* For Shops */}
                            <div>
                                <h4 className="font-bold mb-5 text-base text-white">Für Shops</h4>
                                <ul className="space-y-3">
                                    {['Shop registrieren', 'So funktioniert es', 'Preise', 'Erfolgsgeschichten'].map((item, idx) => (
                                        <li key={idx}>
                                            <Link href="#" className="text-white/70 hover:text-white transition-colors text-sm flex items-center gap-2 group">
                                                <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                                <span className="group-hover:translate-x-1 transition-transform">{item}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Newsletter */}
                            <div>
                                <h4 className="font-bold mb-5 text-base text-white">Newsletter</h4>
                                <p className="text-white/70 text-sm mb-4">
                                    Erhalte die besten Deals direkt in dein Postfach.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="Deine E-Mail"
                                        className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
                                        style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                                    />
                                    <button
                                        className="px-4 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                                        style={{ background: 'var(--gradient-warm)', color: 'white' }}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                            <p className="text-sm text-white/50">
                                © {new Date().getFullYear()} Bereket Market. Mit ❤️ für unsere Community.
                            </p>
                            <div className="flex gap-6">
                                {['Impressum', 'Datenschutz', 'AGB'].map((item, idx) => (
                                    <Link key={idx} href="#" className="text-sm text-white/50 hover:text-white transition-colors">
                                        {item}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </footer>
            )}
        </>
    );
}
