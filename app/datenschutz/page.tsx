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
                                1. Verantwortlicher
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Verantwortlich für die Datenverarbeitung auf dieser Webseite ist:<br />
                                Turgay Yildiz, Lahnstrasse 2, 65479 Raunheim<br />
                                E-Mail: info@bereket.market<br />
                                Weitere Angaben finden Sie im <a href="/impressum" className="underline hover:text-[var(--terracotta)]">Impressum</a>.
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                2. Datenschutz auf einen Blick
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Der Schutz Ihrer persönlichen Daten ist uns wichtig. Diese Webseite erhebt nur technisch notwendige Daten und verwendet <strong>keine Tracking-Cookies</strong> oder personalisierte Werbung. Die Datenverarbeitung erfolgt ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TDDDG).
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                3. Datenerfassung auf dieser Webseite
                            </h2>

                            <h3 className="font-bold mb-2 text-lg">Hosting (Vercel)</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)] mb-4">
                                Diese Webseite wird bei Vercel Inc. (USA) gehostet. Beim Besuch werden automatisch technische Daten (IP-Adresse, Browsertyp, Zugriffszeit) in Server-Logfiles gespeichert. <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb der Webseite). <strong>Speicherdauer:</strong> Server-Logs werden nach 30 Tagen automatisch gelöscht. Vercel nutzt EU-Standard-Vertragsklauseln für den Datentransfer in die USA.
                            </p>

                            <h3 className="font-bold mb-2 text-lg">Kontaktformular (Resend)</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)] mb-4">
                                Für den E-Mail-Versand über unser Kontaktformular nutzen wir den Dienst Resend (USA). Ihre eingegebenen Daten (Name, E-Mail, Nachricht) werden ausschließlich zur Bearbeitung Ihrer Anfrage verwendet. <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung). <strong>Speicherdauer:</strong> Daten werden nach Abschluss der Anfrage gelöscht, spätestens nach 6 Monaten.
                            </p>

                            <h3 className="font-bold mb-2 text-lg">E-Mail-Kommunikation (Zoho)</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Unsere E-Mail-Kommunikation erfolgt über Zoho Mail (EU-Server). Anfragen per E-Mail werden vertraulich behandelt. <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO. <strong>Speicherdauer:</strong> E-Mails werden nach Abschluss der Kommunikation gelöscht, spätestens nach 12 Monaten.
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                4. Ihre Rechte
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)] mb-4">
                                Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
                            </p>
                            <ul className="list-disc list-inside text-[var(--warm-gray)] mb-4 space-y-1">
                                <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
                                <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
                                <li>Recht auf Löschung (Art. 17 DSGVO)</li>
                                <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                                <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                                <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
                            </ul>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Bei Fragen zum Datenschutz kontaktieren Sie uns unter info@bereket.market.
                            </p>
                        </div>

                        <div className="pt-8 border-t border-[var(--sand)]">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                5. Beschwerderecht
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Die für uns zuständige Aufsichtsbehörde ist:<br /><br />
                                Der Hessische Beauftragte für Datenschutz und Informationsfreiheit<br />
                                Postfach 3163, 65021 Wiesbaden<br />
                                <a href="https://datenschutz.hessen.de" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--terracotta)]">https://datenschutz.hessen.de</a>
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
