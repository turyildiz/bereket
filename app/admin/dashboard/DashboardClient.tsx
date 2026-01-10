'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Market {
    id: string;
    name: string;
    city: string;
    whatsapp_numbers: string[];
    header_url: string | null;
    logo_url: string | null;
    created_at: string;
}

interface DashboardClientProps {
    initialMarkets: Market[];
    userEmail: string;
}

export default function DashboardClient({ initialMarkets, userEmail }: DashboardClientProps) {
    const [markets, setMarkets] = useState<Market[]>(initialMarkets);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        city: '',
        whatsapp_numbers: [''],
        header_url: '',
        logo_url: '',
    });
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const handleAddWhatsApp = () => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: [...prev.whatsapp_numbers, '']
        }));
    };

    const handleRemoveWhatsApp = (index: number) => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: prev.whatsapp_numbers.filter((_, i) => i !== index)
        }));
    };

    const handleWhatsAppChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            whatsapp_numbers: prev.whatsapp_numbers.map((num, i) => i === index ? value : num)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const filteredNumbers = formData.whatsapp_numbers.filter(num => num.trim() !== '');

        const { data, error } = await supabase
            .from('markets')
            .insert({
                name: formData.name,
                city: formData.city,
                whatsapp_numbers: filteredNumbers,
                header_url: formData.header_url || null,
                logo_url: formData.logo_url || null,
            })
            .select()
            .single();

        if (error) {
            alert('Fehler beim Erstellen: ' + error.message);
        } else if (data) {
            setMarkets(prev => [data, ...prev]);
            setFormData({
                name: '',
                city: '',
                whatsapp_numbers: [''],
                header_url: '',
                logo_url: '',
            });
            setShowCreateForm(false);
        }
        setLoading(false);
    };

    const handleDeleteMarket = async (id: string) => {
        if (!confirm('Möchten Sie diesen Markt wirklich löschen?')) return;

        const { error } = await supabase
            .from('markets')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Fehler beim Löschen: ' + error.message);
        } else {
            setMarkets(prev => prev.filter(m => m.id !== id));
        }
    };

    const handleSeedData = async () => {
        if (!confirm('Möchten Sie 1 Beispiel-Markt und 1 Angebot einfügen?')) return;

        setSeeding(true);

        // Insert Market with exact field mappings
        const { data: insertedMarket, error: marketError } = await supabase
            .from('markets')
            .insert({
                name: 'Yildiz Market',
                city: 'Frankfurt',
                location: 'Musterstraße 123, 60311 Frankfurt',
                whatsapp_numbers: ['+49123456789'],
                logo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e'
            })
            .select()
            .single();

        if (marketError) {
            alert('Fehler beim Einfügen des Marktes: ' + marketError.message);
            setSeeding(false);
            return;
        }

        if (!insertedMarket) {
            alert('Kein Markt wurde eingefügt.');
            setSeeding(false);
            return;
        }

        // Insert Offer with exact field mappings (using the market_id from inserted market)
        const { error: offerError } = await supabase
            .from('offers')
            .insert({
                market_id: insertedMarket.id,
                product_name: 'Frische Granatäpfel',
                price: '1.49€',
                original_price: '2.49€',
                expires_at: '2026-12-31',
                image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5'
            });

        if (offerError) {
            alert('Markt erstellt, aber Fehler beim Angebot: ' + offerError.message);
        } else {
            alert('✅ Erfolgreich eingefügt: 1 Markt und 1 Angebot!');
        }

        // Refresh markets list
        setMarkets(prev => [insertedMarket, ...prev]);
        setSeeding(false);
    };

    return (
        <div className="min-h-screen" style={{ background: 'var(--gradient-earth)' }}>
            {/* Admin Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(250, 247, 242, 0.9)', borderColor: 'var(--sand)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl" style={{ background: 'var(--gradient-warm)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Admin Dashboard
                                </h1>
                                <p className="text-xs" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                    Bereket Market
                                </p>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'var(--sand)' }}>
                                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--cardamom)' }} />
                                <span className="text-sm font-medium" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>{userEmail}</span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                                style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)', fontFamily: 'var(--font-outfit)' }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="hidden sm:inline">Abmelden</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                            Market Manager
                        </h2>
                        <p style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                            {markets.length} Märkte registriert
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Seed Sample Data Button */}
                        <button
                            onClick={handleSeedData}
                            disabled={seeding}
                            className="glass-card px-5 py-3 flex items-center gap-2 text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-60"
                            style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                        >
                            {seeding ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Wird geladen...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                    </svg>
                                    <span>Seed Sample Data</span>
                                </>
                            )}
                        </button>

                        {/* Create New Market Button */}
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="btn-primary px-6 py-3 flex items-center gap-2"
                            style={{ fontFamily: 'var(--font-outfit)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Neuen Markt erstellen</span>
                        </button>
                    </div>
                </div>

                {/* Create Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(44, 40, 35, 0.6)' }}>
                        <div className="glass-card w-full max-w-lg p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                    Neuen Markt erstellen
                                </h3>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="p-2 rounded-xl hover:opacity-70 transition-opacity"
                                    style={{ background: 'var(--sand)' }}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--charcoal)' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Market Name */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Marktname *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="z.B. Istanbul Supermarkt"
                                        required
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Stadt *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                        placeholder="z.B. Frankfurt"
                                        required
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                </div>

                                {/* WhatsApp Numbers */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        WhatsApp Nummern
                                    </label>
                                    <div className="space-y-2">
                                        {formData.whatsapp_numbers.map((num, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={num}
                                                    onChange={(e) => handleWhatsAppChange(index, e.target.value)}
                                                    placeholder="+49 123 456789"
                                                    className="flex-1 px-4 py-3 rounded-xl transition-all"
                                                    style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                                />
                                                {formData.whatsapp_numbers.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveWhatsApp(index)}
                                                        className="p-3 rounded-xl hover:opacity-70 transition-opacity"
                                                        style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddWhatsApp}
                                        className="mt-2 flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70"
                                        style={{ color: 'var(--cardamom)', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Weitere Nummer hinzufügen
                                    </button>
                                </div>

                                {/* Header URL */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Header Bild URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.header_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, header_url: e.target.value }))}
                                        placeholder="https://example.com/header.jpg"
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                    <p className="text-xs mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Optional - Banner-Bild für die Shop-Seite
                                    </p>
                                </div>

                                {/* Logo URL */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}>
                                        Logo URL
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.logo_url}
                                        onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                                        placeholder="https://example.com/logo.png"
                                        className="w-full px-4 py-3 rounded-xl transition-all"
                                        style={{ background: 'white', border: '2px solid var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    />
                                    <p className="text-xs mt-1" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        Optional - Logo des Marktes
                                    </p>
                                </div>

                                {/* Submit Button */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="flex-1 py-3 rounded-xl font-semibold transition-all hover:opacity-70"
                                        style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                                        style={{ fontFamily: 'var(--font-outfit)' }}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span>Wird erstellt...</span>
                                            </>
                                        ) : (
                                            <span>Markt erstellen</span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Markets Grid - Glass Card Style */}
                {markets.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--sand)' }}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--warm-gray)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                            Keine Märkte vorhanden
                        </h3>
                        <p className="mb-6" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                            Erstellen Sie Ihren ersten Markt, um loszulegen.
                        </p>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="btn-primary px-6 py-3 inline-flex items-center gap-2"
                            style={{ fontFamily: 'var(--font-outfit)' }}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Ersten Markt erstellen</span>
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {markets.map((market) => (
                            <div key={market.id} className="glass-card hover-lift overflow-hidden">
                                {/* Card Header */}
                                <div className="h-24 relative" style={{ background: 'var(--gradient-warm)' }}>
                                    {market.header_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={market.header_url}
                                            alt=""
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}
                                    {/* Logo Badge */}
                                    <div className="absolute -bottom-6 left-4">
                                        <div
                                            className="w-14 h-14 rounded-xl shadow-lg flex items-center justify-center overflow-hidden"
                                            style={{ background: 'white', border: '3px solid white' }}
                                        >
                                            {market.logo_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={market.logo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--saffron)' }}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 pt-8">
                                    <h4 className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--charcoal)' }}>
                                        {market.name}
                                    </h4>
                                    <div className="flex items-center gap-1 text-sm mb-4" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>{market.city}</span>
                                    </div>

                                    {/* WhatsApp Numbers */}
                                    {market.whatsapp_numbers && market.whatsapp_numbers.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}>
                                                WhatsApp ({market.whatsapp_numbers.length})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {market.whatsapp_numbers.slice(0, 2).map((num, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="text-xs px-2 py-1 rounded-lg"
                                                        style={{ background: 'rgba(107, 142, 122, 0.1)', color: 'var(--cardamom-dark)', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        {num}
                                                    </span>
                                                ))}
                                                {market.whatsapp_numbers.length > 2 && (
                                                    <span
                                                        className="text-xs px-2 py-1 rounded-lg"
                                                        style={{ background: 'var(--sand)', color: 'var(--warm-gray)', fontFamily: 'var(--font-outfit)' }}
                                                    >
                                                        +{market.whatsapp_numbers.length - 2} weitere
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--sand)' }}>
                                        <button
                                            className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all hover:opacity-70 flex items-center justify-center gap-1"
                                            style={{ background: 'var(--sand)', color: 'var(--charcoal)', fontFamily: 'var(--font-outfit)' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Bearbeiten
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMarket(market.id)}
                                            className="py-2 px-3 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
                                            style={{ background: 'rgba(216, 99, 78, 0.1)', color: 'var(--terracotta)' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
