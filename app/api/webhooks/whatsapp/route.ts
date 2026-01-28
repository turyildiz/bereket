import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';
import crypto from 'crypto';

/**
 * Verify Meta webhook signature to ensure request is authentic
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) {
        console.error('[Webhook] Missing X-Hub-Signature-256 header');
        return false;
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
        console.error('[Webhook] WHATSAPP_APP_SECRET not configured');
        return false;
    }

    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );

    if (!isValid) {
        console.error('[Webhook] Invalid signature. Expected:', expectedSignature.substring(0, 20) + '...');
    }

    return isValid;
}

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
    // Read raw body first for signature verification
    let rawBody: string;
    try {
        rawBody = await request.text();
    } catch (error) {
        console.error('[Webhook] Failed to read request body:', error);
        return new Response('Bad Request', { status: 400 });
    }

    // Verify webhook signature (security: reject spoofed requests)
    const signature = request.headers.get('x-hub-signature-256');
    if (!verifyWebhookSignature(rawBody, signature)) {
        console.error('[Webhook] Signature verification failed - rejecting request');
        return new Response('Unauthorized', { status: 401 });
    }

    // Use service_role client to bypass RLS (needed to check all markets including inactive)
    const supabase = createServiceClient();

    // Parse request body with error handling
    let body;
    try {
        body = JSON.parse(rawBody);
    } catch (error) {
        console.error('JSON parse error:', error);
        return new Response('Invalid JSON', { status: 400 });
    }

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
    const messageId = message.id; // WhatsApp message ID (wamid)
    const type = message.type; // 'text', 'image', etc.

    // EXTRACT SENDER NUMBER: Use wa_id from contacts (canonical WhatsApp ID from Meta)
    // This is the most reliable field for the sender's phone number
    const senderNumber = value?.contacts?.[0]?.wa_id || message.from;

    console.log('=== AUTHORIZATION DEBUG ===');
    console.log('Raw sender (message.from):', message.from);
    console.log('Canonical sender (wa_id):', value?.contacts?.[0]?.wa_id);
    console.log('Using senderNumber:', senderNumber);

    // NORMALIZE PHONE NUMBER: Remove '+' prefix and any spaces for consistent matching
    const normalizedSender = senderNumber.replace(/^\+/, '').replace(/\s/g, '');
    console.log('Normalized sender:', normalizedSender);

    // AUTHORIZATION CHECK: Verify sender is from an authorized market
    // Query ALL markets (both active and inactive) to distinguish between:
    // 1. Unregistered number (no market found) -> Send "access denied"
    // 2. Inactive market (market found but is_active=false) -> Send "account paused"
    console.log('Querying markets table with contains:', [normalizedSender]);

    const { data: market, error: marketError } = await supabase
        .from('markets')
        .select('id, name, is_active, whatsapp_numbers')
        .contains('whatsapp_numbers', [normalizedSender])
        .maybeSingle();

    if (marketError) {
        console.error('Market query error:', marketError);
    }

    if (market) {
        console.log('✅ Market found:', market.name, '| Active:', market.is_active);
        console.log('Authorized numbers for this market:', market.whatsapp_numbers);
    }

    if (!market) {
        console.log('❌ UNAUTHORIZED - No market found for number:', normalizedSender);

        // Send WhatsApp reply to unauthorized sender
        try {
            const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: senderNumber,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: "🚫 Zugriff verweigert: Dieser WhatsApp-Service ist registrierten Ladenbesitzern vorbehalten.\n\nWenn Sie Partner sind und glauben, dass dies ein Fehler ist, kontaktieren Sie bitte den Support. Wenn Sie beitreten möchten, besuchen Sie unsere Website: http://www.bereket.market"
                    }
                })
            });

            const responseData = await response.json();
            console.log('META RESPONSE BODY:', JSON.stringify(responseData, null, 2));
            console.log('Sent access denied message to:', senderNumber);
        } catch (replyError) {
            console.error('Error sending WhatsApp reply:', replyError);
        }

        // Return 200 OK to prevent Meta retries
        return new Response('Success', { status: 200 });
    }

    // CHECK IF MARKET IS ACTIVE (after confirming market exists)
    if (!market.is_active) {
        console.log('⏸️ INACTIVE MARKET - Account paused:', market.name);

        // Send WhatsApp reply to inactive market
        try {
            const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: senderNumber,
                    type: 'text',
                    text: {
                        preview_url: true,
                        body: "⏸️ Ihr Account ist aktuell pausiert. Bitte kontaktieren Sie Ihren Berater.\n\nBesuchen Sie unsere Website: http://www.bereket.market"
                    }
                })
            });

            const responseData = await response.json();
            console.log('META RESPONSE BODY:', JSON.stringify(responseData, null, 2));
            console.log('Sent account paused message to:', senderNumber);
        } catch (replyError) {
            console.error('Error sending WhatsApp reply:', replyError);
        }

        // Return 200 OK to prevent Meta retries
        return new Response('Success', { status: 200 });
    }

    console.log('Message recognized from authorized market: ' + market.name);

    // =========================================================================
    // WAITING ROOM INTEGRATION: Add message to pending_messages for merging
    // =========================================================================

    // Extract message content
    let caption: string | null = null;
    let imageUrl: string | null = null;

    if (type === 'text') {
        caption = message.text?.body || null;
    } else if (type === 'image') {
        caption = message.image?.caption || null;
        const imageId = message.image?.id;

        // Get image URL from WhatsApp
        if (imageId) {
            try {
                imageUrl = await getWhatsAppMediaUrl(imageId);
                console.log('📸 Image URL obtained:', imageUrl ? 'Yes' : 'No');
            } catch (err) {
                console.error('Error getting image URL:', err);
            }
        }
    }

    console.log('Message content:', { caption, hasImage: !!imageUrl, type });

    // Import the waiting room modules dynamically
    const { upsertPendingMessage } = await import('@/lib/pendingMessages');
    const { scheduleMessageProcessing } = await import('@/lib/messageProcessor');

    // Add to waiting room (merge if recent message exists)
    const { success, pendingMessage, error } = await upsertPendingMessage(
        normalizedSender,
        market.id,
        caption,
        imageUrl,
        messageId
    );

    if (!success) {
        console.error('Error upserting pending message:', error);
        return new Response('Error processing message', { status: 500 });
    }

    console.log('✅ Message added to waiting room:', pendingMessage?.id);

    // Schedule processing in 15 seconds
    scheduleMessageProcessing(normalizedSender, market.id, senderNumber);

    // Return immediate 200 OK to Meta
    return new Response('Success', { status: 200 });
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get WhatsApp media URL from Meta's API
 */
async function getWhatsAppMediaUrl(mediaId: string): Promise<string | null> {
    try {
        // Step 1: Get media URL from Meta
        const metaResponse = await fetch(
            `https://graph.facebook.com/v17.0/${mediaId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
                }
            }
        );

        const metaData = await metaResponse.json();
        const mediaUrl = metaData.url;

        if (!mediaUrl) {
            console.error('No media URL in Meta response');
            return null;
        }

        return mediaUrl;
    } catch (err) {
        console.error('Error fetching WhatsApp media URL:', err);
        return null;
    }
}
