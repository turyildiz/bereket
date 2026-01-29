'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { submitShopInquiry } from '@/app/actions/submitShopInquiry';

export default function ForShopsPage() {
    const t = useTranslations('forShops');
    const tCommon = useTranslations('common');

    const [formData, setFormData] = useState({
        shopName: '',
        ownerName: '',
        email: '',
        phone: '',
        city: '',
        message: '',
        website: '', // Honeypot field
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await submitShopInquiry(formData);

            if (result.success) {
                setIsSubmitted(true);
            } else {
                console.error('Submission error:', result.error);
                alert(t('errorMessage'));
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert(t('errorMessage'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen" style={{ background: 'var(--cream)' }}>
            {/* Hero Section */}
            <section className="relative overflow-hidden">
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

                <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="pt-8 pb-4">
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

                    <div className="py-12 sm:py-16 lg:py-20 text-center">
                        {/* Badge */}
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 animate-fade-in-up"
                            style={{
                                background: 'rgba(225, 139, 85, 0.15)',
                                border: '1px solid rgba(225, 139, 85, 0.3)'
                            }}
                        >
                            <svg className="w-4 h-4" style={{ color: '#E18B55' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-sm font-semibold" style={{ color: '#E18B55' }}>
                                {t('badge')}
                            </span>
                        </div>

                        <h1
                            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 animate-fade-in-up leading-tight"
                            style={{ fontFamily: 'var(--font-playfair)', animationDelay: '0.1s' }}
                        >
                            {t('title')}{' '}
                            <span className="text-gradient-warm">{tCommon('brandName')}</span>
                        </h1>
                        <p
                            className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto animate-fade-in-up"
                            style={{ animationDelay: '0.2s' }}
                        >
                            {t('subtitle')}
                        </p>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="var(--cream)" />
                    </svg>
                </div>
            </section>

            {/* Benefits + Form Section */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Left: Benefits */}
                    <div className="space-y-8">
                        <div>
                            <h2
                                className="text-3xl sm:text-4xl font-bold mb-6"
                                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                            >
                                {t('whyTitle')}
                            </h2>
                            <p className="text-lg" style={{ color: 'var(--warm-gray)' }}>
                                {t('whySubtitle')}
                            </p>
                        </div>

                        <div className="space-y-6">
                            {[
                                {
                                    icon: (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    ),
                                    title: t('benefit1Title'),
                                    description: t('benefit1Desc'),
                                },
                                {
                                    icon: (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ),
                                    title: t('benefit2Title'),
                                    description: t('benefit2Desc'),
                                },
                                {
                                    icon: (
                                        <span className="text-xl font-black">€</span>
                                    ),
                                    title: t('benefit3Title'),
                                    description: t('benefit3Desc'),
                                },
                                {
                                    icon: (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    ),
                                    title: t('benefit4Title'),
                                    description: t('benefit4Desc'),
                                },
                            ].map((benefit, idx) => (
                                <div
                                    key={idx}
                                    className="flex gap-4 p-5 rounded-2xl transition-all duration-300 hover:shadow-lg animate-fade-in-up"
                                    style={{
                                        background: 'white',
                                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                                        animationDelay: `${0.1 + idx * 0.1}s`
                                    }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: 'var(--gradient-warm)', color: 'white' }}
                                    >
                                        {benefit.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold mb-1" style={{ color: 'var(--charcoal)' }}>
                                            {benefit.title}
                                        </h3>
                                        <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                            {benefit.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Contact Form */}
                    <div
                        className="rounded-3xl p-8 sm:p-10 animate-fade-in-up"
                        style={{
                            background: 'white',
                            boxShadow: '0 10px 50px rgba(0, 0, 0, 0.1)',
                            animationDelay: '0.2s'
                        }}
                    >
                        {isSubmitted ? (
                            <div className="text-center py-12">
                                <div
                                    className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                                    style={{ background: 'var(--mint)' }}
                                >
                                    <svg className="w-10 h-10" style={{ color: 'var(--cardamom)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3
                                    className="text-2xl font-bold mb-3"
                                    style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                >
                                    {t('successTitle')}
                                </h3>
                                <p className="text-lg mb-6" style={{ color: 'var(--warm-gray)' }}>
                                    {t('successMessage')}
                                </p>
                                <button
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        setFormData({
                                            shopName: '',
                                            ownerName: '',
                                            email: '',
                                            phone: '',
                                            city: '',
                                            message: '',
                                            website: '',
                                        });
                                    }}
                                    className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 cursor-pointer"
                                    style={{ background: 'var(--gradient-warm)', color: 'white' }}
                                >
                                    {t('newInquiry')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-8">
                                    <h3
                                        className="text-2xl font-bold mb-2"
                                        style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                                    >
                                        {t('formTitle')}
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--warm-gray)' }}>
                                        {t('formSubtitle')}
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Honeypot field - invisible to humans */}
                                    <input
                                        type="text"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        style={{ display: 'none' }}
                                        tabIndex={-1}
                                        autoComplete="off"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
                                                {t('shopName')} *
                                            </label>
                                            <input
                                                type="text"
                                                name="shopName"
                                                value={formData.shopName}
                                                onChange={handleChange}
                                                required
                                                placeholder={t('shopNamePlaceholder')}
                                                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                                                style={{
                                                    background: 'var(--cream)',
                                                    color: 'var(--charcoal)',
                                                    border: '2px solid var(--sand)'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
                                                {t('yourName')} *
                                            </label>
                                            <input
                                                type="text"
                                                name="ownerName"
                                                value={formData.ownerName}
                                                onChange={handleChange}
                                                required
                                                placeholder={t('yourNamePlaceholder')}
                                                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                                                style={{
                                                    background: 'var(--cream)',
                                                    color: 'var(--charcoal)',
                                                    border: '2px solid var(--sand)'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
                                                {t('email')} *
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder={t('emailPlaceholder')}
                                                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                                                style={{
                                                    background: 'var(--cream)',
                                                    color: 'var(--charcoal)',
                                                    border: '2px solid var(--sand)'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
                                                {t('phone')}
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder={t('phonePlaceholder')}
                                                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                                                style={{
                                                    background: 'var(--cream)',
                                                    color: 'var(--charcoal)',
                                                    border: '2px solid var(--sand)'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
                                            {t('city')} *
                                        </label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleChange}
                                            required
                                            placeholder={t('cityPlaceholder')}
                                            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                                            style={{
                                                background: 'var(--cream)',
                                                color: 'var(--charcoal)',
                                                border: '2px solid var(--sand)'
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)' }}>
                                            {t('message')}
                                        </label>
                                        <textarea
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            rows={4}
                                            placeholder={t('messagePlaceholder')}
                                            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none"
                                            style={{
                                                background: 'var(--cream)',
                                                color: 'var(--charcoal)',
                                                border: '2px solid var(--sand)'
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                        style={{ background: 'var(--gradient-warm)', color: 'white' }}
                                    >
                                        {isSubmitting ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                {t('submit')}
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-center" style={{ color: 'var(--warm-gray)' }}>
                                        {t('privacyConsent')}
                                    </p>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div
                    className="rounded-3xl p-8 sm:p-12 text-center"
                    style={{
                        background: 'linear-gradient(135deg, #2C2823 0%, #1a1714 100%)'
                    }}
                >
                    <h3
                        className="text-2xl sm:text-3xl font-bold text-white mb-4"
                        style={{ fontFamily: 'var(--font-playfair)' }}
                    >
                        {t('questionsTitle')}
                    </h3>
                    <p className="text-white/70 mb-6 max-w-xl mx-auto">
                        {t('questionsText')}
                    </p>
                    <a
                        href="mailto:info@bereket.market"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 cursor-pointer"
                        style={{ background: 'var(--gradient-warm)', color: 'white' }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        info@bereket.market
                    </a>
                </div>
            </section>
        </main>
    );
}
