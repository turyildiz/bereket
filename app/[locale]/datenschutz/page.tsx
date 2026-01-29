'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function Datenschutz() {
    const t = useTranslations('datenschutz');
    const tCommon = useTranslations('common');

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
                        <span className="text-sm font-medium">{tCommon('backToHome')}</span>
                    </Link>
                </div>

                {/* Centered Content */}
                <div className="relative z-10 flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                    <div className="text-center">
                        <h1
                            className="text-4xl sm:text-5xl font-black text-white mb-6 animate-fade-in-up leading-tight"
                            style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                        >
                            {t('title')}
                        </h1>
                        <p
                            className="text-lg text-white/70 max-w-2xl mx-auto animate-fade-in-up"
                            style={{ animationDelay: '0.2s' }}
                        >
                            {t('subtitle')}
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
                                {t('section1Title')}
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                {t('section1Text')}<br /><br />
                                <span dangerouslySetInnerHTML={{ __html: t('section1Contact') }} />
                            </p>
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                {t('section2Title')}
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]" dangerouslySetInnerHTML={{ __html: t('section2Text') }} />
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                {t('section3Title')}
                            </h2>

                            <h3 className="font-bold mb-2 text-lg">{t('section3HostingTitle')}</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)] mb-4" dangerouslySetInnerHTML={{ __html: t('section3HostingText') }} />

                            <h3 className="font-bold mb-2 text-lg">{t('section3ContactTitle')}</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)] mb-4" dangerouslySetInnerHTML={{ __html: t('section3ContactText') }} />

                            <h3 className="font-bold mb-2 text-lg">{t('section3EmailTitle')}</h3>
                            <p className="leading-relaxed text-[var(--warm-gray)]" dangerouslySetInnerHTML={{ __html: t('section3EmailText') }} />
                        </div>

                        <div className="mb-10">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                {t('section4Title')}
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)] mb-4">
                                {t('section4Intro')}
                            </p>
                            <ul className="list-disc list-inside text-[var(--warm-gray)] mb-4 space-y-1">
                                {(t.raw('section4Rights') as string[]).map((right, idx) => (
                                    <li key={idx}>{right}</li>
                                ))}
                            </ul>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                {t('section4Contact')}
                            </p>
                        </div>

                        <div className="pt-8 border-t border-[var(--sand)]">
                            <h2
                                className="text-2xl font-bold mb-4"
                                style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                                {t('section5Title')}
                            </h2>
                            <p className="leading-relaxed text-[var(--warm-gray)]">
                                {t('section5Text')}<br /><br />
                                <span dangerouslySetInnerHTML={{ __html: t('section5Authority') }} /><br />
                                <a href="https://datenschutz.hessen.de" target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--terracotta)]">https://datenschutz.hessen.de</a>
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
