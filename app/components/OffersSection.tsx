'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';

interface Offer {
    id: string;
    product_name: string;
    price: string;
    unit?: string | null;
    description?: string | null;
    image_id: string | null;
    expires_at: string;
    market_id: string;
    markets: {
        id: string;
        name: string;
    } | null;
    image_library: {
        url: string;
    } | null;
}

/**
 * Client component for the Offers section that shows:
 * - Favorite market offers if user has favorites
 * - Latest offers if user has no favorites
 */
export default function OffersSection() {
    const { favorites, isLoaded, hasFavorites } = useFavorites();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isLoadingOffers, setIsLoadingOffers] = useState(true);

    useEffect(() => {
        const fetchOffers = async () => {
            if (!isLoaded) return;

            setIsLoadingOffers(true);
            const supabase = createClient();

            let query = supabase
                .from('offers')
                .select('id, product_name, price, unit, description, image_id, expires_at, market_id, markets(id, name), image_library(url)')
                .eq('status', 'live')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            // If user has favorites, filter by favorite market IDs
            if (hasFavorites && favorites.length > 0) {
                query = query.in('market_id', favorites);
            }

            const { data, error } = await query.limit(6);

            if (error) {
                console.error('Error fetching offers:', error);
                setOffers([]);
            } else {
                setOffers((data as unknown as Offer[]) || []);
            }
            setIsLoadingOffers(false);
        };

        fetchOffers();
    }, [favorites, isLoaded, hasFavorites]);

    // Determine section title and subtitle based on favorites
    const sectionTitle = hasFavorites ? 'Angebote deiner Favoriten' : 'Neueste Angebote';
    const sectionSubtitle = hasFavorites
        ? 'Aktuelle Deals von deinen Lieblingsmärkten.'
        : 'KI-erkannte Deals, frisch für dich.';
    const badgeText = hasFavorites ? 'Deine Favoriten' : 'Live-Updates';

    // Determine CTA button link
    const ctaLink = hasFavorites ? '/offers?favorites=true' : '/offers';

    if (!isLoaded) {
        return (
            <section
                className="relative py-20 sm:py-28 overflow-hidden grain-texture"
                style={{ background: 'linear-gradient(180deg, var(--cream) 0%, #F4E4D7 100%)' }}
            >
                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--saffron)] border-t-transparent"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className="relative py-20 sm:py-28 overflow-hidden grain-texture"
            style={{ background: 'linear-gradient(180deg, var(--cream) 0%, #F4E4D7 100%)' }}
        >
            {/* Decorative Background */}
            <div className="absolute top-20 right-0 w-96 h-96 opacity-10 blur-3xl animate-float" style={{ background: 'var(--saffron)' }}></div>
            <div className="absolute bottom-20 left-0 w-96 h-96 opacity-10 blur-3xl animate-float" style={{ background: 'var(--terracotta)', animationDelay: '3s' }}></div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="text-center md:text-left">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                            style={{
                                background: hasFavorites ? 'rgba(225, 139, 85, 0.15)' : 'white',
                                color: hasFavorites ? '#E18B55' : 'var(--terracotta)'
                            }}
                        >
                            {hasFavorites ? (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                            ) : (
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--terracotta)' }}></span>
                            )}
                            <span className="text-sm font-bold">{badgeText}</span>
                        </div>
                        <h2
                            className="text-4xl sm:text-5xl font-black tracking-tight mb-4"
                            style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}
                        >
                            {sectionTitle}
                        </h2>
                        <p className="text-lg sm:text-xl" style={{ color: 'var(--warm-gray)' }}>
                            {sectionSubtitle}
                        </p>
                    </div>
                </div>

                {isLoadingOffers ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--saffron)] border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {offers.length > 0 ? (
                            offers.map((offer, idx) => {
                                const marketData = offer.markets;
                                const marketName = marketData?.name || 'Lokaler Markt';
                                const expiresDate = new Date(offer.expires_at);
                                const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                                return (
                                    <Link
                                        href={marketData ? `/shop/${marketData.id}` : '#'}
                                        key={offer.id}
                                        className="group relative rounded-3xl overflow-hidden cursor-pointer hover-lift animate-scale-in block"
                                        style={{
                                            background: 'white',
                                            boxShadow: '0 4px 25px rgba(0, 0, 0, 0.08)',
                                            animationDelay: `${idx * 0.05}s`
                                        }}
                                    >
                                        {/* Image */}
                                        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#f8f5f0' }}>
                                            <img
                                                src={offer.image_library?.url || 'https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&q=80&w=600'}
                                                alt={offer.product_name}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {/* Expiry Badge */}
                                            {daysLeft <= 3 && (
                                                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg" style={{ background: 'var(--terracotta)', color: 'white' }}>
                                                    {daysLeft <= 0 ? 'Läuft heute ab' : `Noch ${daysLeft} Tag${daysLeft > 1 ? 'e' : ''}`}
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-6">
                                            <h3
                                                className="font-bold text-xl mb-2"
                                                style={{
                                                    fontFamily: 'var(--font-playfair)',
                                                    color: 'var(--charcoal)'
                                                }}
                                            >
                                                {offer.product_name}
                                            </h3>

                                            {/* AI-generated description */}
                                            {offer.description && (
                                                <p className="text-sm mb-3" style={{ color: 'var(--warm-gray)' }}>
                                                    {offer.description}
                                                </p>
                                            )}

                                            <p className="text-xs mb-4" style={{ color: 'var(--warm-gray)', opacity: 0.8 }}>
                                                Gültig bis {expiresDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} bei {marketName}.
                                            </p>

                                            <div
                                                className="flex items-center justify-between pt-4 border-t"
                                                style={{ borderColor: 'var(--sand)' }}
                                            >
                                                <div>
                                                    <span
                                                        className="text-2xl font-black"
                                                        style={{ color: 'var(--terracotta)' }}
                                                    >
                                                        {offer.price} €
                                                    </span>
                                                    {offer.unit && (
                                                        <span className="text-sm ml-1" style={{ color: 'var(--warm-gray)' }}>
                                                            / {offer.unit}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'var(--gradient-warm)' }}>
                                                        {marketName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium" style={{ color: 'var(--warm-gray)' }}>
                                                        {marketName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-12">
                                <p className="text-lg" style={{ color: 'var(--warm-gray)' }}>
                                    {hasFavorites
                                        ? 'Aktuell keine Angebote von deinen Favoriten verfügbar.'
                                        : 'Aktuell keine Angebote verfügbar. Schau bald wieder vorbei!'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* CTA Button */}
                {offers.length > 0 && (
                    <div className="mt-16 text-center">
                        <Link
                            href={ctaLink}
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
                            style={{
                                background: 'var(--gradient-warm)',
                                color: 'white'
                            }}
                        >
                            Alle Angebote ansehen
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
}
