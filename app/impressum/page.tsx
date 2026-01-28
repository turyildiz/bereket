'use client';

import Link from 'next/link';

export default function Impressum() {
    return (
        <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
            {/* Hero Section */}
            <section className="relative overflow-hidden min-h-[400px] flex flex-col">
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(135deg, #2C2823 0%, #1a1714 50%, #2C2823 100%)'
                    }}
                />
                <div
                    className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl"
                    style={{ background: 'var(--saffron)' }}
                />
                <div
                    className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
                    style={{ background: 'var(--terracotta)' }}
                />

                {/* Top Bar with Back Link */}
                <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    <Link
                        href="/"
                        className="group inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-300"
                    >
                        <span className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:-translate-x-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Zurück zur Startseite</span>
                    </Link>
                </div>

                {/* Centered Content */}
                <div className="relative z-10 flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    <div className="text-center">
                        <h1
                            className="text-4xl sm:text-5xl font-black text-white mb-6 animate-fade-in-up leading-tight"
                            style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                        >
                            Impressum
                        </h1>
                        <p
                            className="text-lg text-white/70 max-w-2xl mx-auto animate-fade-in-up"
                            style={{ animationDelay: '0.2s' }}
                        >
                            Rechtliche Informationen zu Bereket Market.
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="var(--cream)" />
                    </svg>
                </div>
            </section>

            {/* Content Section */}
            <section className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
                <div
                    className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm animate-fade-in-up"
                    style={{ animationDelay: '0.3s' }}
                >
                    <div className="prose prose-lg max-w-none text-[var(--charcoal)]">
                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                Angaben gemäß § 5 DDG
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Turgay Yildiz<br />
                                Lahnstrasse 2<br />
                                65479 Raunheim
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                Kontakt
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Telefon: +49 156 78525429<br />
                                E-Mail: info@bereket.market
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Turgay Yildiz<br />
                                Lahnstrasse 2<br />
                                65479 Raunheim
                            </p>
                        </div>

                        <div className="pt-8 border-t border-[var(--sand)]">
                            <h3
                                className="text-xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                Hinweis zum Status des Projekts
                            </h3>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Bereket Market wird aktuell als privates Pilotprojekt zur Marktforschung betrieben. Es erfolgt derzeit keine gewerbliche Tätigkeit und keine Erzielung von Einnahmen. Bei erfolgreichem Abschluss der Testphase und Aufnahme eines regulären Geschäftsbetriebs wird eine entsprechende Gewerbeanmeldung vorgenommen.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
