import { NextRequest, NextResponse } from 'next/server';
import { getAllReadyPendingMessages } from '@/lib/pendingMessages';
import { processPendingMessage } from '@/lib/messageProcessor';

/**
 * Cron job endpoint to process pending WhatsApp messages
 * Runs every minute to check for messages that have been waiting 15+ seconds
 *
 * This replaces the previous setTimeout-based approach which doesn't work
 * in serverless environments where functions terminate after returning.
 */
export async function GET(request: NextRequest) {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log('[Cron] Unauthorized request - missing or invalid CRON_SECRET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting pending messages processing...');

    try {
        // Get all messages ready to process
        const { success, messages, error } = await getAllReadyPendingMessages();

        if (!success) {
            console.error('[Cron] Failed to fetch ready messages:', error);
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
        }

        if (messages.length === 0) {
            console.log('[Cron] No messages ready to process');
            return NextResponse.json({ processed: 0, message: 'No messages ready' });
        }

        console.log(`[Cron] Processing ${messages.length} ready message(s)...`);

        // Process each message
        const results = await Promise.allSettled(
            messages.map(async (msg) => {
                console.log(`[Cron] Processing message ${msg.id} from ${msg.sender_number}`);
                return processPendingMessage({
                    id: msg.id,
                    sender_number: msg.sender_number,
                    market_id: msg.market_id,
                    caption: msg.caption,
                    image_url: msg.image_url
                });
            })
        );

        // Count successes and failures
        const succeeded = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failed = results.length - succeeded;

        console.log(`[Cron] Completed: ${succeeded} succeeded, ${failed} failed`);

        return NextResponse.json({
            processed: messages.length,
            succeeded,
            failed,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[Cron] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
