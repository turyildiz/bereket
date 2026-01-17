import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppMediaUrl } from './media';
import { analyzeOffer, generateProductImage, assessImageQuality } from '@/lib/ai';

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
    const messageId = message.id; // WhatsApp message ID (wamid)
    const from = message.from; // Sender's phone number
    const type = message.type; // 'text', 'image', etc.

    // AUTHORIZATION CHECK: Verify sender is from an authorized market
    // This happens BEFORE deduplication and any AI processing to prevent costs
    const { data: market, error: marketError } = await supabase
        .from('markets')
        .select('id, name, is_active')
        .contains('whatsapp_numbers', [from])
        .single();

    if (!market) {
        console.log('Unauthorized number: ' + from);

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
                    to: from,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: "🚫 Zugriff verweigert: Dieser WhatsApp-Service ist registrierten Ladenbesitzern vorbehalten.\n\nWenn Sie Partner sind und glauben, dass dies ein Fehler ist, kontaktieren Sie bitte den Support. Wenn Sie beitreten möchten, besuchen Sie unsere Website: http://www.bereket.market"
                    }
                })
            });

            const responseData = await response.json();
            console.log('META RESPONSE BODY:', JSON.stringify(responseData, null, 2)); // This reveals the real error
            console.log('Sent access denied message to:', from);
        } catch (replyError) {
            console.error('Error sending WhatsApp reply:', replyError);
        }

        // Return 200 OK to prevent Meta retries
        return new Response('Success', { status: 200 });
    }

    // CHECK IF MARKET IS ACTIVE
    if (!market.is_active) {
        console.log('Inactive market attempted to send message: ' + market.name);

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
                    to: from,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: "⏸️ Ihr Account ist aktuell pausiert. Bitte kontaktieren Sie Ihren Berater."
                    }
                })
            });

            const responseData = await response.json();
            console.log('META RESPONSE BODY:', JSON.stringify(responseData, null, 2));
            console.log('Sent account paused message to:', from);
        } catch (replyError) {
            console.error('Error sending WhatsApp reply:', replyError);
        }

        // Return 200 OK to prevent Meta retries
        return new Response('Success', { status: 200 });
    }

    console.log('Message recognized from authorized market: ' + market.name);

    // DEDUPLICATION CHECK: Check if this message was already processed
    const { data: existingOffer } = await adminClient
        .from('offers')
        .select('id')
        .eq('message_id', messageId)
        .single();

    if (existingOffer) {
        console.log(`Message ${messageId} already processed, skipping duplicate`);
        return new Response('Success', { status: 200 });
    }

    // IMMEDIATE 200 OK: Send response to Meta immediately to prevent timeout/retry
    // Process the message in the background
    void (async () => {
        try {
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

            console.log('Message recognized from: ' + market.name);

            // Determine product_name based on message type
            let productName: string;
            if (type === 'image') {
                productName = caption || 'WhatsApp Bild';
            } else {
                productName = content || 'WhatsApp Nachricht';
            }

            // Analyze the offer with AI first to get category and product info
            const messageText = caption || content || '';
            console.log('Analyzing offer with AI...');

            const aiAnalysis = await analyzeOffer(messageText, undefined); // Don't pass image yet

            if (aiAnalysis) {
                console.log('AI Analysis complete:', aiAnalysis);
            } else {
                console.log('AI Analysis failed, using fallback values');
            }

            // Extract specific product name for granular image library search
            const specificProductName = aiAnalysis?.product_name || productName;
            console.log(`🏷️ Specific product identified: "${specificProductName}"`);

            // ========================================
            // GRANULAR IMAGE LIBRARY LOGIC STARTS HERE
            // Matching based on specific product (e.g., 'Zitrone', not 'Obst')
            // ========================================
            let finalImageLibraryId: string | null = null;

            // Step 1: Check if incoming message has an image
            if (type === 'image' && imageId) {
                console.log('📸 Incoming image detected, processing...');

                try {
                    // Download the image from WhatsApp
                    const metaDownloadUrl = await getWhatsAppMediaUrl(imageId);

                    if (metaDownloadUrl) {
                        console.log('Got Meta download URL, fetching image...');

                        const imageResponse = await fetch(metaDownloadUrl, {
                            headers: {
                                'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
                            }
                        });

                        if (imageResponse.ok) {
                            const imageBuffer = await imageResponse.arrayBuffer();

                            // Upload temporarily to get a URL for AI assessment
                            const tempFilename = `temp-${Date.now()}.jpg`;
                            const { error: tempUploadError } = await adminClient
                                .storage
                                .from('offer-images')
                                .upload(tempFilename, imageBuffer, {
                                    contentType: 'image/jpeg',
                                    upsert: false
                                });

                            if (!tempUploadError) {
                                const { data: tempUrlData } = adminClient
                                    .storage
                                    .from('offer-images')
                                    .getPublicUrl(tempFilename);

                                const tempImageUrl = tempUrlData.publicUrl;

                                // Step 2: Assess image quality with AI for this specific product
                                console.log(`🔍 Assessing if image is a professional photo of "${specificProductName}"...`);
                                const quality = await assessImageQuality(tempImageUrl, specificProductName);
                                console.log(`✅ Image quality assessment: ${quality}`);

                                if (quality === 'GOOD') {
                                    // Step 3: Image is GOOD - Save to image_library
                                    console.log('✨ Image is professional quality! Saving to image library...');

                                    // Rename the temp file to permanent
                                    const permanentFilename = `library-${Date.now()}.jpg`;

                                    // Copy to permanent location
                                    const { error: copyError } = await adminClient
                                        .storage
                                        .from('offer-images')
                                        .upload(permanentFilename, imageBuffer, {
                                            contentType: 'image/jpeg',
                                            upsert: false
                                        });

                                    if (!copyError) {
                                        const { data: permanentUrlData } = adminClient
                                            .storage
                                            .from('offer-images')
                                            .getPublicUrl(permanentFilename);

                                        // Insert into image_library table with specific product_name
                                        const { data: libraryEntry, error: libraryError } = await adminClient
                                            .from('image_library')
                                            .insert({
                                                url: permanentUrlData.publicUrl,
                                                product_name: specificProductName
                                            })
                                            .select('id')
                                            .single();

                                        if (!libraryError && libraryEntry) {
                                            finalImageLibraryId = libraryEntry.id;
                                            console.log(`📚 Image saved to library with ID: ${finalImageLibraryId}`);
                                        } else {
                                            console.error('Error saving to image_library:', libraryError);
                                        }
                                    }

                                    // Clean up temp file
                                    await adminClient.storage.from('offer-images').remove([tempFilename]);
                                } else {
                                    // Image is BAD - clean up and proceed to fallback
                                    console.log('⚠️ Image quality is not professional, will search library or generate new');
                                    await adminClient.storage.from('offer-images').remove([tempFilename]);
                                }
                            }
                        }
                    }
                } catch (imageError) {
                    console.error('Error processing incoming image:', imageError);
                }
            }

            // Step 4: If no good image yet, search the image library by specific product name
            if (!finalImageLibraryId) {
                console.log(`🔎 Searching image library for product: "${specificProductName}"...`);

                const { data: existingLibraryImage, error: searchError } = await adminClient
                    .from('image_library')
                    .select('id')
                    .eq('product_name', specificProductName)
                    .limit(1)
                    .single();

                if (!searchError && existingLibraryImage) {
                    finalImageLibraryId = existingLibraryImage.id;
                    console.log(`♻️ Found existing image in library! ID: ${finalImageLibraryId} (Zero cost reuse)`);
                } else {
                    // Step 5: Not found in library - Generate new AI image
                    console.log('🎨 No image in library, generating new AI image...');

                    const generatedImageUrl = await generateProductImage(specificProductName);

                    if (generatedImageUrl) {
                        console.log('✅ AI image generated successfully');

                        // Convert Base64 to storage if needed
                        const isBase64 = generatedImageUrl.startsWith('data:image/');

                        if (isBase64) {
                            try {
                                const base64Data = generatedImageUrl.split(',')[1];
                                const imageBuffer = Buffer.from(base64Data, 'base64');

                                const filename = `ai-generated-${Date.now()}.png`;
                                const { error: uploadError } = await adminClient
                                    .storage
                                    .from('offer-images')
                                    .upload(filename, imageBuffer, {
                                        contentType: 'image/png',
                                        upsert: false
                                    });

                                if (!uploadError) {
                                    const { data: publicUrlData } = adminClient
                                        .storage
                                        .from('offer-images')
                                        .getPublicUrl(filename);

                                    // Save to image_library with specific product_name
                                    const { data: newLibraryEntry, error: newLibraryError } = await adminClient
                                        .from('image_library')
                                        .insert({
                                            url: publicUrlData.publicUrl,
                                            product_name: specificProductName
                                        })
                                        .select('id')
                                        .single();

                                    if (!newLibraryError && newLibraryEntry) {
                                        finalImageLibraryId = newLibraryEntry.id;
                                        console.log(`📚 AI image saved to library with ID: ${finalImageLibraryId}`);
                                    }
                                }
                            } catch (conversionError) {
                                console.error('Error converting Base64 to storage:', conversionError);
                            }
                        } else {
                            // It's already a URL - save directly to library with specific product_name
                            const { data: newLibraryEntry, error: newLibraryError } = await adminClient
                                .from('image_library')
                                .insert({
                                    url: generatedImageUrl,
                                    product_name: specificProductName
                                })
                                .select('id')
                                .single();

                            if (!newLibraryError && newLibraryEntry) {
                                finalImageLibraryId = newLibraryEntry.id;
                                console.log(`📚 AI image URL saved to library with ID: ${finalImageLibraryId}`);
                            }
                        }
                    } else {
                        console.error('❌ AI image generation failed');
                    }
                }
            }

            // ========================================
            // IMAGE LIBRARY LOGIC ENDS HERE
            // ========================================

            // Calculate expiration date using AI-extracted duration or default to 7 days
            const expiresInDays = aiAnalysis?.expires_in_days || 7;
            const expiresAtDate = new Date();
            expiresAtDate.setDate(expiresAtDate.getDate() + expiresInDays);
            console.log(`📅 Offer expires in ${expiresInDays} days (${expiresAtDate.toISOString()})`);

            // Insert offer with image_id (NOT image_url)
            const { error: insertError } = await adminClient
                .from('offers')
                .insert({
                    market_id: market.id,
                    message_id: messageId, // Store WhatsApp message ID for deduplication
                    product_name: specificProductName,
                    description: aiAnalysis?.description || 'WhatsApp Draft',
                    price: aiAnalysis?.price ? parseFloat(aiAnalysis.price) : 0,
                    unit: aiAnalysis?.unit || 'Stück',
                    ai_category: aiAnalysis?.ai_category || null,
                    expires_at: expiresAtDate.toISOString(),
                    status: 'draft',
                    image_id: finalImageLibraryId, // Use image_id instead of image_url
                    raw_whatsapp_data: body
                });

            if (insertError) {
                console.log('Error creating offer: ', insertError.message);
            } else {
                console.log('Successfully created draft offer for: ' + market.name);
                console.log(`Image Library ID used: ${finalImageLibraryId || 'None'}`);
            }
        } catch (error) {
            console.error('Error in background processing:', error);
        }
    })();

    // Return 200 OK immediately
    return new Response('Success', { status: 200 });
}
