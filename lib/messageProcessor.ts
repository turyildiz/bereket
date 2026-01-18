/**
 * Message Processor
 * Handles delayed processing of pending messages after the 15-second wait
 */

import { createClient } from '@supabase/supabase-js';
import { getReadyPendingMessage, markAsProcessing, deletePendingMessage } from './pendingMessages';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

interface ProcessResult {
    success: boolean;
    offerId?: string;
    error?: string;
    invalidReason?: string;
}

/**
 * Schedule processing of a pending message after 15 seconds
 */
export function scheduleMessageProcessing(
    senderNumber: string,
    marketId: string,
    senderWhatsAppNumber: string
): void {
    console.log(`[Processor] ⏰ Scheduled processing for ${senderNumber} in 16 seconds`);

    // Wait 16 seconds (1 second buffer) to ensure the 15-second check passes
    setTimeout(async () => {
        console.log(`[Processor] ⏱️ 16 seconds elapsed, checking if message is ready...`);
        await processReadyMessage(senderNumber, marketId, senderWhatsAppNumber);
    }, 16 * 1000); // 16 seconds (15 + 1 buffer)
}

/**
 * Process a ready pending message
 */
async function processReadyMessage(
    senderNumber: string,
    marketId: string,
    senderWhatsAppNumber: string
): Promise<ProcessResult> {
    try {
        // Check if there's a ready message
        const { success, pendingMessage, error } = await getReadyPendingMessage(senderNumber, marketId);

        if (!success || !pendingMessage) {
            console.log('[Processor] No message ready to process (might have been updated recently)');
            return { success: false, error: error || 'No message found' };
        }

        console.log('[Processor] 🎯 Processing message:', {
            caption: pendingMessage.caption,
            hasImage: !!pendingMessage.image_url
        });

        // Mark as processing to prevent duplicate processing
        await markAsProcessing(pendingMessage.id);

        // Process with AI
        const result = await processWithAI(pendingMessage, marketId, senderWhatsAppNumber);

        // Delete the pending message after processing
        await deletePendingMessage(pendingMessage.id);

        return result;
    } catch (err) {
        console.error('[Processor] Error processing message:', err);
        return { success: false, error: String(err) };
    }
}

/**
 * Process message with AI validation and create offer if valid
 */
async function processWithAI(
    pendingMessage: any,
    marketId: string,
    senderWhatsAppNumber: string
): Promise<ProcessResult> {
    try {
        console.log('[Processor] 🤖 Sending to AI for validation via OpenRouter...');

        const systemPrompt = `You are a validation gatekeeper for a grocery market offer system.

Your job: Check if this message contains BOTH a clear Product Name AND a Price.

Rules:
1. If BOTH product name AND price are present → Extract and return JSON with the data
2. If MISSING product name → Return exactly: "INVALID: MISSING_PRODUCT"
3. If MISSING price → Return exactly: "INVALID: MISSING_PRICE"
4. If BOTH are missing → Return exactly: "INVALID: MISSING_BOTH"
5. If the message is gibberish/unclear → Return exactly: "INVALID: UNCLEAR_MESSAGE"

If VALID, return JSON like this:
{
    "product_name": "Extracted product name in German",
    "price": 4.99,
    "unit": "kg or Stück or Bund etc.",
    "description": "An appetizing 1-sentence description of the product in German that makes customers want to buy it. Do NOT include price, validity period, or unit here - just describe the product quality/taste/freshness.",
    "ai_category": "Category from: Obst & Gemüse, Fleisch & Wurst, Milchprodukte, Backwaren, Getränke, Sonstiges"
}

If INVALID, return one of the INVALID codes above.`;

        const userMessage = `Message to validate:
Caption: ${pendingMessage.caption || 'No caption'}
Has Image: ${pendingMessage.image_url ? 'Yes' : 'No'}`;

        // Build messages array for OpenRouter
        const messages: any[] = [
            { role: 'system', content: systemPrompt }
        ];

        // Add user message (with image if available)
        if (pendingMessage.image_url) {
            const imageBase64 = await fetchImageAsBase64(pendingMessage.image_url);
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: userMessage },
                    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: userMessage });
        }

        // Call OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://bereket.market',
                'X-Title': 'Bereket Market WhatsApp Bot'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: messages,
                temperature: 0.3,
                max_tokens: 500
            })
        });

        const aiData = await response.json();
        const aiText = aiData?.choices?.[0]?.message?.content || '';

        console.log('[Processor] AI Response:', aiText);
        console.log('[Processor] Full AI Data:', JSON.stringify(aiData, null, 2));

        // Handle empty or missing AI response
        if (!aiText || aiText.trim() === '') {
            console.log('[Processor] ❌ AI returned empty response, treating as invalid');
            await sendRejectionMessage(senderWhatsAppNumber, 'INVALID: UNCLEAR_MESSAGE');
            return { success: false, invalidReason: 'INVALID: EMPTY_RESPONSE' };
        }

        // Check if AI returned INVALID
        if (aiText.trim().startsWith('INVALID:')) {
            const invalidReason = aiText.trim();
            console.log('[Processor] ❌ AI Validation Failed:', invalidReason);

            // Send rejection message to user
            await sendRejectionMessage(senderWhatsAppNumber, invalidReason);

            return { success: false, invalidReason };
        }

        // Try to parse as JSON
        let offerData;
        try {
            const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            offerData = JSON.parse(cleanJson);
        } catch (parseError) {
            console.log('[Processor] ❌ Failed to parse AI response as JSON:', parseError);
            console.log('[Processor] Raw AI text:', aiText);
            // If we can't parse as JSON and it's not INVALID, treat as unclear
            await sendRejectionMessage(senderWhatsAppNumber, 'INVALID: UNCLEAR_MESSAGE');
            return { success: false, invalidReason: 'INVALID: PARSE_ERROR' };
        }

        console.log('[Processor] ✅ AI Validation Passed, creating offer...');

        // Handle image: upload new one OR find existing in library
        let imageId: string | null = null;

        if (pendingMessage.image_url) {
            // User sent an image - upload it
            try {
                console.log('[Processor] 📸 Uploading image to storage...');

                // Fetch image from WhatsApp
                const imageResponse = await fetch(pendingMessage.image_url, {
                    headers: {
                        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
                    }
                });

                if (imageResponse.ok) {
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const filename = `whatsapp-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

                    // Upload to Supabase storage
                    const { error: uploadError } = await supabase
                        .storage
                        .from('offer-images')
                        .upload(filename, imageBuffer, {
                            contentType: 'image/jpeg',
                            upsert: false
                        });

                    if (!uploadError) {
                        // Get public URL
                        const { data: urlData } = supabase
                            .storage
                            .from('offer-images')
                            .getPublicUrl(filename);

                        // Save to image_library
                        const { data: libraryEntry, error: libraryError } = await supabase
                            .from('image_library')
                            .insert({
                                url: urlData.publicUrl,
                                product_name: offerData.product_name
                            })
                            .select('id')
                            .single();

                        if (!libraryError && libraryEntry) {
                            imageId = libraryEntry.id;
                            console.log('[Processor] ✅ Image uploaded and saved to library:', imageId);
                        } else {
                            console.error('[Processor] Error saving to image_library:', libraryError);
                        }
                    } else {
                        console.error('[Processor] Error uploading image:', uploadError);
                    }
                } else {
                    console.error('[Processor] Failed to fetch WhatsApp image:', imageResponse.status);
                }
            } catch (imageError) {
                console.error('[Processor] Error processing image:', imageError);
            }
        } else {
            // No image sent - search image_library for existing image with same product name
            console.log('[Processor] 🔎 No image sent, searching library for:', offerData.product_name);

            const { data: existingImage, error: searchError } = await supabase
                .from('image_library')
                .select('id')
                .eq('product_name', offerData.product_name)
                .limit(1)
                .maybeSingle();

            if (!searchError && existingImage) {
                imageId = existingImage.id;
                console.log('[Processor] ♻️ Found existing image in library:', imageId);
            } else {
                console.log('[Processor] ℹ️ No existing image found for product:', offerData.product_name);
            }
        }

        // Create offer in database
        const { data: offer, error } = await supabase
            .from('offers')
            .insert({
                market_id: marketId,
                product_name: offerData.product_name,
                price: offerData.price,
                unit: offerData.unit || null,
                description: offerData.description || null,
                ai_category: offerData.ai_category || null,
                image_id: imageId,
                status: 'draft',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            })
            .select()
            .single();

        if (error) {
            console.error('[Processor] Error creating offer:', error);
            return { success: false, error: error.message };
        }

        console.log('[Processor] ✅ Offer created:', offer.id, 'with image_id:', imageId);

        return { success: true, offerId: offer.id };

    } catch (err) {
        console.error('[Processor] Error in AI processing:', err);
        return { success: false, error: String(err) };
    }
}

/**
 * Send rejection message to WhatsApp
 */
async function sendRejectionMessage(toNumber: string, invalidReason: string): Promise<void> {
    try {
        // Map invalid reasons to user-friendly German messages
        let message = "Ich konnte kein Angebot erkennen. Bitte sende Produktname und Preis zusammen mit dem Bild.";

        if (invalidReason.includes('MISSING_PRODUCT')) {
            message = "Ich sehe keinen Produktnamen. Bitte sende den Produktnamen zusammen mit dem Preis.";
        } else if (invalidReason.includes('MISSING_PRICE')) {
            message = "Ich sehe keinen Preis. Bitte sende den Preis zusammen mit dem Produktnamen.";
        } else if (invalidReason.includes('MISSING_BOTH')) {
            message = "Ich brauche sowohl den Produktnamen als auch den Preis. Bitte sende beides zusammen.";
        }

        await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toNumber,
                type: 'text',
                text: {
                    preview_url: false,
                    body: message
                }
            })
        });

        console.log('[Processor] ✅ Sent rejection message to:', toNumber);
    } catch (err) {
        console.error('[Processor] Error sending rejection message:', err);
    }
}

/**
 * Fetch image and convert to base64
 * WhatsApp media URLs require authorization header
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl, {
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
    });
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}
