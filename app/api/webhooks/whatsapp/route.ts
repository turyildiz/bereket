import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppMediaUrl } from './media';
import { analyzeOffer, generateProductImage } from '@/lib/ai';

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

            if (!market) {
                console.log('Unauthorized number: ' + from);
                return;
            }

            console.log('Message recognized from: ' + market.name);

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

            // Analyze the offer with AI before saving
            const messageText = caption || content || '';
            console.log('Analyzing offer with AI...');

            const aiAnalysis = await analyzeOffer(messageText, imageUrl || undefined);

            if (aiAnalysis) {
                console.log('AI Analysis complete:', aiAnalysis);
            } else {
                console.log('AI Analysis failed, using fallback values');
            }

            // Determine final image URL based on AI analysis
            let finalImageUrl: string;
            const placeholderUrl = 'https://placehold.co/600x400/eeeeee/999999?text=Kein+Bild';

            if (aiAnalysis?.is_image_professional && imageUrl) {
                // Use the original WhatsApp photo if it's professional
                console.log('Using original professional image');
                finalImageUrl = imageUrl;
            } else {
                // Try to generate a professional AI image
                console.log('Original image not professional, generating AI image...');
                const generatedImageUrl = await generateProductImage(
                    aiAnalysis?.product_name || productName
                );

                if (generatedImageUrl) {
                    // Verify if it's a Base64 data URL or regular URL
                    const isBase64 = generatedImageUrl.startsWith('data:image/');
                    console.log(`AI image generated successfully (${isBase64 ? 'Base64 data URL' : 'Regular URL'})`);
                    console.log(`Image length: ${generatedImageUrl.length} characters`);

                    // Convert Base64 to Storage
                    if (isBase64) {
                        try {
                            console.log('Converting Base64 to storage...');

                            // Extract base64 data (remove data:image/png;base64, prefix)
                            const base64Data = generatedImageUrl.split(',')[1];
                            const imageBuffer = Buffer.from(base64Data, 'base64');

                            // Upload to Supabase Storage
                            const filename = `ai-generated-${Date.now()}.png`;
                            const { error: uploadError } = await adminClient
                                .storage
                                .from('offer-images')
                                .upload(filename, imageBuffer, {
                                    contentType: 'image/png',
                                    upsert: false
                                });

                            if (uploadError) {
                                console.log('Error uploading AI image to storage:', uploadError.message);
                                // Fallback to original image or placeholder
                                finalImageUrl = imageUrl || placeholderUrl;
                            } else {
                                // Get the public URL
                                const { data: publicUrlData } = adminClient
                                    .storage
                                    .from('offer-images')
                                    .getPublicUrl(filename);

                                finalImageUrl = publicUrlData.publicUrl;
                                console.log('AI image successfully saved to Storage!');
                            }
                        } catch (conversionError) {
                            console.log('Error converting Base64 to storage:', conversionError);
                            finalImageUrl = imageUrl || placeholderUrl;
                        }
                    } else {
                        // It's already a URL
                        finalImageUrl = generatedImageUrl;
                    }
                } else if (imageUrl) {
                    // Fallback to original image if generation fails
                    console.log('AI generation failed, using original image');
                    finalImageUrl = imageUrl;
                } else {
                    // Use placeholder if no image available
                    console.log('No image available, using placeholder');
                    finalImageUrl = placeholderUrl;
                }
            }

            console.log(`Final image URL type: ${finalImageUrl.startsWith('data:image/') ? 'Base64 data URL' : 'Regular URL'}`);

            // Calculate expiration date (default 7 days)
            const expiresAtDate = new Date();
            expiresAtDate.setDate(expiresAtDate.getDate() + 7);

            const { error: insertError } = await adminClient
                .from('offers')
                .insert({
                    market_id: market.id,
                    message_id: messageId, // Store WhatsApp message ID for deduplication
                    product_name: aiAnalysis?.product_name || productName,
                    description: aiAnalysis?.description || 'WhatsApp Draft',
                    price: aiAnalysis?.price ? parseFloat(aiAnalysis.price) : 0,
                    unit: aiAnalysis?.unit || 'Stück',
                    ai_category: aiAnalysis?.ai_category || null,
                    expires_at: expiresAtDate.toISOString(),
                    status: 'draft',
                    image_url: finalImageUrl,
                    raw_whatsapp_data: body
                });

            if (insertError) {
                console.log('Error creating offer: ', insertError.message);
            } else {
                console.log('Successfully created draft offer for: ' + market.name);
            }
        } catch (error) {
            console.error('Error in background processing:', error);
        }
    })();

    // Return 200 OK immediately
    return new Response('Success', { status: 200 });
}
