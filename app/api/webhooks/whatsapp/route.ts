import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppMediaUrl } from './media';

// Create Supabase client for database lookups
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET handler for Meta WhatsApp Webhook verification handshake
 * Meta sends a verification request when setting up the webhook
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new NextResponse(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST handler for incoming WhatsApp messages
 * Meta sends message data to this endpoint when users send messages
 */
export async function POST(request: NextRequest) {
    // Create admin client with service role key for secure server-side operations
    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Parse request body first
    const body = await request.json();

    // Debug: Log entire raw payload from Meta
    console.log("--- New Incoming Webhook ---");
    console.log(JSON.stringify(body, null, 2));

    // Extract message details from Meta's webhook payload structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Ignore status updates (delivered, read receipts) - only process actual messages
    if (value?.statuses) {
        return NextResponse.json({ ok: true });
    }

    // Only process if messages exist
    const messages = value?.messages;
    if (!messages || messages.length === 0) {
        return NextResponse.json({ ok: true });
    }

    const message = messages[0];
    const from = message.from; // Sender's phone number
    const type = message.type; // 'text', 'image', etc.

    let content: string | null = null;
    let caption: string | null = null;
    let imageId: string | null = null;

    if (type === 'text') {
        content = message.text?.body;
    } else if (type === 'image') {
        imageId = message.image?.id; // Image ID for later retrieval
        caption = message.image?.caption || null;
        console.log('Image ID detected: ' + imageId);
    }

    console.log('New Message from:', from, 'Type:', type);
    if (content) console.log('  Content:', content);
    if (caption) console.log('  Caption:', caption);

    // Database lookup: Check if the sender is from an authorized market
    const { data: market, error } = await supabase
        .from('markets')
        .select('id, name')
        .contains('whatsapp_numbers', [from])
        .single();

    if (error && error.code !== 'PGRST116') {
        // Log actual database errors (not "no rows found")
        console.error('Database lookup error:', error);
    }

    if (market) {
        console.log('Message recognized from: ' + market.name);

        // Create a draft offer for the recognized market
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        // Determine product_name based on message type
        let productName: string;
        if (type === 'image') {
            productName = caption || 'WhatsApp Bild';
        } else {
            productName = content || 'WhatsApp Nachricht';
        }

        // Handle image download and storage
        let imageUrl: string | null = null;

        if (type === 'image' && imageId) {
            try {
                // Step 1: Get the temporary download URL from Meta
                const metaDownloadUrl = await getWhatsAppMediaUrl(imageId);

                if (metaDownloadUrl) {
                    console.log('Got Meta download URL, fetching image...');

                    // Step 2: Download the actual image from Meta's servers
                    const imageResponse = await fetch(metaDownloadUrl, {
                        headers: {
                            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
                        }
                    });

                    if (imageResponse.ok) {
                        const imageBuffer = await imageResponse.arrayBuffer();

                        // Step 3: Upload to Supabase Storage
                        const filename = `whatsapp-${Date.now()}.jpg`;

                        const { error: uploadError } = await adminClient
                            .storage
                            .from('offer-images')
                            .upload(filename, imageBuffer, {
                                contentType: 'image/jpeg',
                                upsert: false
                            });

                        if (uploadError) {
                            console.log('Error uploading to storage:', uploadError.message);
                        } else {
                            // Step 4: Get the public URL
                            const { data: publicUrlData } = adminClient
                                .storage
                                .from('offer-images')
                                .getPublicUrl(filename);

                            imageUrl = publicUrlData.publicUrl;
                            console.log('Image successfully saved to Storage and linked to Offer!');
                        }
                    } else {
                        console.log('Failed to download image from Meta:', imageResponse.status);
                    }
                } else {
                    console.log('Could not get Meta download URL for image');
                }
            } catch (imageError) {
                console.log('Error in image processing:', imageError);
            }
        }

        const { error: insertError } = await adminClient
            .from('offers')
            .insert({
                market_id: market.id,
                product_name: productName,
                description: 'WhatsApp Draft',
                price: 0,
                expires_at: expiresAt.toISOString(),
                status: 'draft',
                image_url: imageUrl,
                raw_whatsapp_data: body
            });

        if (insertError) {
            console.log('Error creating offer: ', insertError.message);
        } else {
            console.log('Successfully created draft offer for: ' + market.name);
        }
    } else {
        console.log('Unauthorized number: ' + from);
    }

    return NextResponse.json({ ok: true });
}
