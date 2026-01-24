'use server';

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createServiceClient } from '@/utils/supabase/service';

// ============================================================================
// Zod Schemas
// ============================================================================

const OpeningHoursSchema = z.object({
    day: z.string().min(1),
    time: z.string().min(1),
});

const MarketDataSchema = z.object({
    slug: z.string().min(1, 'Slug ist erforderlich.'),
    name: z.string().min(1, 'Name ist erforderlich.'),
    city: z.string().min(1, 'Stadt ist erforderlich.'),
    zip_code: z.string().nullable(),
    full_address: z.string().min(1, 'Adresse ist erforderlich.'),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    customer_phone: z.string().nullable(),
    whatsapp_numbers: z.array(z.string()),
    header_url: z.string().url().nullable().or(z.literal('')).transform(v => v || null),
    logo_url: z.string().url().nullable().or(z.literal('')).transform(v => v || null),
    about_text: z.string().nullable(),
    features: z.array(z.string()).nullable(),
    opening_hours: z.array(OpeningHoursSchema).nullable(),
    is_premium: z.boolean(),
});

type MarketData = z.infer<typeof MarketDataSchema>;

// ============================================================================
// Result types
// ============================================================================

interface ActionResult {
    success: boolean;
    error?: string;
}

interface SeedResult {
    success: boolean;
    error?: string;
    marketsInserted?: number;
    offersInserted?: number;
}

// ============================================================================
// Helper: Verify admin session
// ============================================================================

async function verifyAdmin(): Promise<{ userId: string } | { error: string }> {
    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
        return { error: 'Nicht authentifiziert. Bitte erneut anmelden.' };
    }

    const { data: isAdmin, error: rpcError } = await authClient.rpc('is_admin');

    if (rpcError || !isAdmin) {
        return { error: 'Keine Berechtigung. Nur Admins können Märkte verwalten.' };
    }

    return { userId: user.id };
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Creates a new market.
 *
 * Security: session → is_admin() → Zod validation → service_role insert
 */
export async function createMarket(rawData: unknown): Promise<ActionResult> {
    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const parsed = MarketDataSchema.safeParse(rawData);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: `Validierungsfehler: ${firstError.path.join('.')} – ${firstError.message}` };
    }

    const serviceClient = createServiceClient();

    const { error: insertError } = await serviceClient
        .from('markets')
        .insert(parsed.data)
        .select()
        .single();

    if (insertError) {
        console.error('[markets/createMarket] Insert failed:', insertError);
        return { success: false, error: 'Datenbankfehler beim Erstellen des Markts.' };
    }

    return { success: true };
}

/**
 * Updates an existing market's profile data.
 *
 * Security: session → is_admin() → Zod validation → market exists → service_role update
 */
export async function updateMarket(marketId: string, rawData: unknown): Promise<ActionResult> {
    if (!marketId || typeof marketId !== 'string') {
        return { success: false, error: 'Ungültige Markt-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const parsed = MarketDataSchema.safeParse(rawData);
    if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return { success: false, error: `Validierungsfehler: ${firstError.path.join('.')} – ${firstError.message}` };
    }

    const serviceClient = createServiceClient();

    // Verify market exists
    const { data: existing, error: fetchError } = await serviceClient
        .from('markets')
        .select('id')
        .eq('id', marketId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Markt nicht gefunden.' };
    }

    const { error: updateError } = await serviceClient
        .from('markets')
        .update(parsed.data)
        .eq('id', marketId);

    if (updateError) {
        console.error('[markets/updateMarket] Update failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Aktualisieren des Markts.' };
    }

    return { success: true };
}

/**
 * Toggles a market's is_active status (activate/deactivate).
 *
 * Security: session → is_admin() → market exists → service_role update
 */
export async function updateMarketStatus(
    marketId: string,
    isActive: boolean
): Promise<ActionResult> {
    if (!marketId || typeof marketId !== 'string') {
        return { success: false, error: 'Ungültige Markt-ID.' };
    }

    if (typeof isActive !== 'boolean') {
        return { success: false, error: 'Ungültiger Status-Wert.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    const { data: market, error: fetchError } = await serviceClient
        .from('markets')
        .select('id')
        .eq('id', marketId)
        .single();

    if (fetchError || !market) {
        return { success: false, error: 'Markt nicht gefunden.' };
    }

    const { error: updateError } = await serviceClient
        .from('markets')
        .update({ is_active: isActive })
        .eq('id', marketId);

    if (updateError) {
        console.error('[markets/updateMarketStatus] Update failed:', updateError);
        return { success: false, error: 'Datenbankfehler beim Aktualisieren des Status.' };
    }

    return { success: true };
}

/**
 * Permanently deletes a market.
 *
 * Security: session → is_admin() → market exists → service_role delete
 */
export async function deleteMarket(marketId: string): Promise<ActionResult> {
    if (!marketId || typeof marketId !== 'string') {
        return { success: false, error: 'Ungültige Markt-ID.' };
    }

    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    const { data: existing, error: fetchError } = await serviceClient
        .from('markets')
        .select('id')
        .eq('id', marketId)
        .single();

    if (fetchError || !existing) {
        return { success: false, error: 'Markt nicht gefunden.' };
    }

    const { error: deleteError } = await serviceClient
        .from('markets')
        .delete()
        .eq('id', marketId);

    if (deleteError) {
        console.error('[markets/deleteMarket] Delete failed:', deleteError);
        return { success: false, error: 'Datenbankfehler beim Löschen des Markts.' };
    }

    return { success: true };
}

/**
 * Seeds the database with sample markets and offers for demo purposes.
 *
 * Security: session → is_admin() → service_role batch insert
 * Note: This inserts 3 markets + 9 offers in a single transaction.
 */
export async function seedSampleMarkets(): Promise<SeedResult> {
    const auth = await verifyAdmin();
    if ('error' in auth) {
        return { success: false, error: auth.error };
    }

    const serviceClient = createServiceClient();

    const sampleMarkets = [
        {
            name: 'Yildiz Market',
            city: 'Frankfurt',
            full_address: 'Musterstraße 123, 60311 Frankfurt',
            latitude: 50.1109,
            longitude: 8.6821,
            customer_phone: '+49 69 12345678',
            whatsapp_numbers: ['4915112345678', '4915187654321'],
            logo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
            header_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&h=400&fit=crop',
            about_text: 'Willkommen bei Yildiz Market! Seit über 20 Jahren versorgen wir unsere Kunden mit frischen Lebensmitteln aus der Türkei.',
            features: ['Halal-zertifiziert', 'Frische Backwaren täglich', 'Parkmöglichkeit'],
            opening_hours: [
                { day: 'Montag - Freitag', time: '08:00 - 20:00' },
                { day: 'Samstag', time: '08:00 - 18:00' },
                { day: 'Sonntag', time: 'Geschlossen' }
            ],
            is_premium: true
        },
        {
            name: 'Bereket Feinkost',
            city: 'Berlin',
            full_address: 'Kottbusser Damm 78, 10967 Berlin',
            latitude: 52.4934,
            longitude: 13.4184,
            customer_phone: '+49 30 11223344',
            whatsapp_numbers: ['4915211223344'],
            logo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=200&h=200&fit=crop',
            header_url: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1200&h=400&fit=crop',
            about_text: 'Bereket Feinkost bietet authentische orientalische Spezialitäten im Herzen von Kreuzberg.',
            features: ['Bio-Produkte', 'Lieferservice', 'Großhandel möglich'],
            opening_hours: [
                { day: 'Montag - Samstag', time: '07:00 - 21:00' },
                { day: 'Sonntag', time: '09:00 - 18:00' }
            ],
            is_premium: true
        },
        {
            name: 'Istanbul Supermarkt',
            city: 'München',
            full_address: 'Goethestraße 15, 80336 München',
            latitude: 48.1351,
            longitude: 11.5820,
            customer_phone: '+49 89 55667788',
            whatsapp_numbers: ['4915355667788', '4915399887766'],
            logo_url: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=200&h=200&fit=crop',
            header_url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1200&h=400&fit=crop',
            about_text: 'Der größte türkische Supermarkt in München mit über 5000 Produkten.',
            features: ['Halal-Fleischtheke', 'Frisches Gemüse', 'Türkische Süßwaren', 'Parkhaus'],
            opening_hours: [
                { day: 'Montag - Freitag', time: '08:00 - 20:00' },
                { day: 'Samstag', time: '08:00 - 18:00' },
                { day: 'Sonntag', time: 'Geschlossen' }
            ],
            is_premium: true
        }
    ];

    // Insert markets
    const { data: insertedMarkets, error: marketError } = await serviceClient
        .from('markets')
        .insert(sampleMarkets)
        .select('id');

    if (marketError || !insertedMarkets || insertedMarkets.length === 0) {
        console.error('[markets/seedSampleMarkets] Market insert failed:', marketError);
        return { success: false, error: 'Fehler beim Einfügen der Märkte.' };
    }

    // Insert offers linked to the new markets
    const sampleOffers = [
        { market_id: insertedMarkets[0].id, product_name: 'Frische Granatäpfel', price: '1.49€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[0].id, product_name: 'Türkischer Honig', price: '8.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[0].id, product_name: 'Fladenbrot 3er Pack', price: '1.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[1].id, product_name: 'Sucuk 500g', price: '5.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[1].id, product_name: 'Weißer Käse', price: '4.49€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[1].id, product_name: 'Oliven Mix 1kg', price: '6.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb5?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[2].id, product_name: 'Baklava 1kg', price: '12.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[2].id, product_name: 'Ayran 10er Pack', price: '3.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop' },
        { market_id: insertedMarkets[2].id, product_name: 'Gewürzmischung Köfte', price: '2.99€', expires_at: '2026-12-31', image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop' },
    ];

    const { error: offerError } = await serviceClient
        .from('offers')
        .insert(sampleOffers);

    if (offerError) {
        console.error('[markets/seedSampleMarkets] Offer insert failed:', offerError);
        return {
            success: true,
            marketsInserted: insertedMarkets.length,
            offersInserted: 0,
            error: 'Märkte erstellt, aber Fehler bei Angeboten.',
        };
    }

    return {
        success: true,
        marketsInserted: insertedMarkets.length,
        offersInserted: sampleOffers.length,
    };
}
