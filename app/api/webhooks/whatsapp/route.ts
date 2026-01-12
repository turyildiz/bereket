import { NextRequest, NextResponse } from 'next/server';

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

    if (type === 'text') {
        content = message.text?.body;
    } else if (type === 'image') {
        content = message.image?.id; // Image ID for later retrieval
        caption = message.image?.caption || null;
    }

    console.log('New Message from:', from, 'Type:', type);
    if (content) console.log('  Content:', content);
    if (caption) console.log('  Caption:', caption);

    return NextResponse.json({ ok: true });
}
