'use client';

import Link from 'next/link';

export default function Datenschutz() {
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
                            Datenschutzerklärung
                        </h1>
                        <p
                            className="text-lg text-white/70 max-w-2xl mx-auto animate-fade-in-up"
                            style={{ animationDelay: '0.2s' }}
                        >
                            Informationen zum Schutz Ihrer persönlichen Daten.
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 z-20">
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
                                1. Datenschutz auf einen Blick
                            </h2>
                            <h3 className="font-bold mb-2 text-lg">Allgemeine Hinweise</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)] mb-4">
                                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                            </p>
                            <h3 className="font-bold mb-2 text-lg">Datenerfassung auf dieser Website</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                2. Hosting
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Wir hosten die Inhalte unserer Website bei folgendem Anbieter:<br />
                                [Muster-Hoster]<br />
                                Musterstraße 123<br />
                                12345 Musterstadt
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                3. Allgemeine Hinweise und Pflichtinformationen
                            </h2>
                            <h3 className="font-bold mb-2 text-lg">Datenschutz</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                4. Datenerfassung auf dieser Website
                            </h2>
                            <h3 className="font-bold mb-2 text-lg">Cookies</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine Textdateien und richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die Dauer einer Sitzung (Session-Cookies) oder dauerhaft (permanente Cookies) auf Ihrem Endgerät gespeichert.
                            </p>
                            <h3 className="font-bold mb-2 text-lg">Server-Log-Dateien</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Der Provider der Seiten erhebt und speichert automatisch Informationen in so genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt.
                            </p>
                        </div>

                        <div className="pt-8 border-t border-[var(--sand)]">
                            <p className="leading-relaxed text-sm text-[var(--warm-gray)]">
                                Dies ist eine vereinfachte Muster-Datenschutzerklärung. Für den produktiven Einsatz muss diese durch einen rechtssicheren Text ersetzt werden, der an die tatsächlichen Gegebenheiten der Website angepasst ist.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
