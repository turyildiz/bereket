/**
 * Pending Messages Manager
 * Handles the "waiting room" logic for message merging and validation
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client for database operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

interface PendingMessage {
    id: string;
    sender_number: string;
    market_id: string;
    caption: string | null;
    image_url: string | null;
    wamid: string | null;
    created_at: string;
    last_updated_at: string;
    is_processing: boolean;
}

/**
 * Check if there's an existing pending message from this sender.
 * - If recent (within 20 seconds): merge the new data with existing
 * - If old (older than 20 seconds): replace with new data (fresh start)
 * - If none exists: create new entry
 */
export async function upsertPendingMessage(
    senderNumber: string,
    marketId: string,
    caption: string | null,
    imageUrl: string | null,
    wamid: string
): Promise<{ success: boolean; pendingMessage?: PendingMessage; error?: string }> {
    try {
        console.log('[PendingMessages] Upserting for sender:', senderNumber);

        // Check for ANY existing pending message from this sender (regardless of age)
        const { data: existing, error: fetchError } = await supabase
            .from('pending_messages')
            .select('*')
            .eq('sender_number', senderNumber)
            .eq('market_id', marketId)
            .eq('is_processing', false)
            .maybeSingle();

        if (fetchError) {
            console.error('[PendingMessages] Error fetching existing:', fetchError);
            return { success: false, error: fetchError.message };
        }

        if (existing) {
            // Check if the existing message is recent (within 20 seconds)
            const twentySecondsAgo = new Date(Date.now() - 20 * 1000);
            const lastUpdated = new Date(existing.last_updated_at);
            const isRecent = lastUpdated > twentySecondsAgo;

            if (isRecent) {
                // MERGE: Combine with existing recent message
                console.log('[PendingMessages] Found recent message, merging...');

                const mergedCaption = existing.caption
                    ? (caption ? `${existing.caption}\n${caption}` : existing.caption)
                    : caption;

                const mergedImageUrl = imageUrl || existing.image_url;

                const { data: updated, error: updateError } = await supabase
                    .from('pending_messages')
                    .update({
                        caption: mergedCaption,
                        image_url: mergedImageUrl,
                        wamid: wamid,
                        last_updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('[PendingMessages] Error updating:', updateError);
                    return { success: false, error: updateError.message };
                }

                console.log('[PendingMessages] ✅ Merged with existing message');
                return { success: true, pendingMessage: updated };
            } else {
                // REPLACE: Old message, start fresh
                console.log('[PendingMessages] Found old message, replacing with fresh data...');

                const { data: updated, error: updateError } = await supabase
                    .from('pending_messages')
                    .update({
                        caption: caption,
                        image_url: imageUrl,
                        wamid: wamid,
                        last_updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('[PendingMessages] Error replacing:', updateError);
                    return { success: false, error: updateError.message };
                }

                console.log('[PendingMessages] ✅ Replaced old pending message');
                return { success: true, pendingMessage: updated };
            }
        } else {
            // CREATE: No existing message, create new
            console.log('[PendingMessages] Creating new pending message...');

            const { data: created, error: createError } = await supabase
                .from('pending_messages')
                .insert({
                    sender_number: senderNumber,
                    market_id: marketId,
                    caption: caption,
                    image_url: imageUrl,
                    wamid: wamid
                })
                .select()
                .single();

            if (createError) {
                console.error('[PendingMessages] Error creating:', createError);
                return { success: false, error: createError.message };
            }

            console.log('[PendingMessages] ✅ Created new pending message');
            return { success: true, pendingMessage: created };
        }
    } catch (err) {
        console.error('[PendingMessages] Unexpected error:', err);
        return { success: false, error: String(err) };
    }
}

/**
 * Get a pending message that's ready to process (15 seconds since last update)
 */
export async function getReadyPendingMessage(
    senderNumber: string,
    marketId: string
): Promise<{ success: boolean; pendingMessage?: PendingMessage; error?: string }> {
    try {
        const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString();

        const { data, error } = await supabase
            .from('pending_messages')
            .select('*')
            .eq('sender_number', senderNumber)
            .eq('market_id', marketId)
            .lte('last_updated_at', fifteenSecondsAgo)
            .eq('is_processing', false)
            .maybeSingle();

        if (error) {
            console.error('[PendingMessages] Error fetching ready message:', error);
            return { success: false, error: error.message };
        }

        if (data) {
            console.log('[PendingMessages] ✅ Found message ready to process');
        }

        return { success: true, pendingMessage: data || undefined };
    } catch (err) {
        console.error('[PendingMessages] Unexpected error:', err);
        return { success: false, error: String(err) };
    }
}

/**
 * Mark a pending message as being processed
 */
export async function markAsProcessing(messageId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('pending_messages')
            .update({
                is_processing: true,
                processed_at: new Date().toISOString()
            })
            .eq('id', messageId);

        if (error) {
            console.error('[PendingMessages] Error marking as processing:', error);
            return false;
        }

        console.log('[PendingMessages] ✅ Marked as processing:', messageId);
        return true;
    } catch (err) {
        console.error('[PendingMessages] Unexpected error:', err);
        return false;
    }
}

/**
 * Delete a processed pending message
 */
export async function deletePendingMessage(messageId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('pending_messages')
            .delete()
            .eq('id', messageId);

        if (error) {
            console.error('[PendingMessages] Error deleting:', error);
            return false;
        }

        console.log('[PendingMessages] ✅ Deleted pending message:', messageId);
        return true;
    } catch (err) {
        console.error('[PendingMessages] Unexpected error:', err);
        return false;
    }
}
