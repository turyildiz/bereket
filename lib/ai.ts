import OpenAI from 'openai';

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

interface AnalyzeOfferResult {
    product_name: string;
    price: string;
    unit: string;
    description: string;
    ai_category: string;
    is_image_professional: boolean;
}

/**
 * Analyzes a WhatsApp caption and optional image to extract product information
 * @param caption - The WhatsApp message caption
 * @param imageUrl - Optional URL of the product image
 * @returns Structured product information
 */
export async function analyzeOffer(
    caption: string,
    imageUrl?: string
): Promise<AnalyzeOfferResult> {
    try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `You are an assistant for Sila Markt. Analyze the WhatsApp caption and image. Return a JSON object with the following fields:
- product_name: A clean, specific product name in German. IMPORTANT: Use PLURAL form if the unit indicates multiple items (kg, Bund, Packung, Kiste) - e.g., "Bananen" for "kg", "Zitronen" for "kg". Use SINGULAR form ONLY if sold individually by "Stück" - e.g., "Banane" for "Stück". Remove punctuation but preserve the correct singular/plural form based on the unit.
- price: Numerical price as string (e.g., "2.99")
- unit: Unit of measurement (e.g., "kg", "Stück", "Bund", "Packung")
- description: An appetizing German sentence describing the product. Use plural form in description if product_name is plural (e.g., "Frische Bananen" not "Frische Banane").
- ai_category: Product category (e.g., "Obst & Gemüse", "Fleisch & Wurst", "Backwaren", "Milchprodukte", "Getränke")
- is_image_professional: Boolean - true ONLY if the photo is a professional product shot on clean background. False if it's a shelf photo, blurry, has text overlays, or is missing.`,
            },
        ];

        // Add user message with image if provided
        if (imageUrl) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: caption },
                    { type: 'image_url', image_url: { url: imageUrl } },
                ],
            });
        } else {
            messages.push({
                role: 'user',
                content: caption,
            });
        }

        const response = await openai.chat.completions.create({
            model: 'google/gemini-3-flash-preview',
            messages,
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No response from AI');
        }

        const result = JSON.parse(content) as AnalyzeOfferResult;
        return result;
    } catch (error) {
        console.error('Error analyzing offer:', error);
        throw error;
    }
}

/**
 * Assesses the quality of a product photo for a specific product
 * @param imageUrl - URL of the image to assess
 * @param productName - Specific product name to check for (e.g., 'Zitrone', 'Brot')
 * @returns 'GOOD' if high-quality, professional photo of the specified product, 'BAD' otherwise
 */
export async function assessImageQuality(imageUrl: string, productName: string): Promise<'GOOD' | 'BAD'> {
    try {
        const response = await openai.chat.completions.create({
            model: 'google/gemini-3-flash-preview',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional product photography assessor. Assess if this image is a high-quality, professional photo of the specified product. Return ONLY the word "GOOD" if it shows ${productName} in high-resolution, well-lit, and professional quality. Return "BAD" if it's low quality, blurry, poorly lit, shows a different product, or is unprofessional.`,
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Is this a high-quality, professional photo of ${productName}? Return "GOOD" or "BAD".` },
                        { type: 'image_url', image_url: { url: imageUrl } },
                    ],
                },
            ],
            temperature: 0.1,
        });

        const content = response.choices[0]?.message?.content?.trim().toUpperCase();

        if (content === 'GOOD') {
            return 'GOOD';
        }

        return 'BAD';
    } catch (error) {
        console.error('Error assessing image quality:', error);
        return 'BAD'; // Default to BAD on error
    }
}

/**
 * Generates a professional product image using AI
 * @param productName - Name of the product to generate image for
 * @returns URL of the generated image (including Base64 data URLs) or null if failed
 */
export async function generateProductImage(
    productName: string
): Promise<string | null> {
    try {
        // @ts-ignore - OpenRouter-specific parameter for image generation
        const response = await openai.chat.completions.create({
            model: 'bytedance-seed/seedream-4.5',
            messages: [
                {
                    role: 'user',
                    content: `Generate a professional, high-quality studio photograph of ${productName} on a clean, light, minimalist background. 8k resolution, food photography style. No text. IMPORTANT: If the product name is plural (e.g., "Bananen", "Zitronen", "Tomaten"), show MULTIPLE items (3-5 pieces). If singular (e.g., "Banane", "Zitrone", "Tomate"), show ONE item only.`,
                },
            ],
            // @ts-ignore - OpenRouter-specific parameter
            modalities: ['image', 'text'],
        });

        // Gemini on OpenRouter returns images in the message.images array
        const message = response.choices[0]?.message;

        // @ts-ignore - OpenRouter-specific response structure
        const images = message?.images;

        if (!images || images.length === 0) {
            console.log('No images returned from Gemini');
            return null;
        }

        // Try multiple possible response structures
        // @ts-ignore
        const imageUrl = images[0]?.url || images[0]?.image_url?.url || images[0];

        if (imageUrl && typeof imageUrl === 'string') {
            // Handle both Base64 data URLs (data:image/png;base64,...) and regular URLs
            console.log('Image generated successfully:', imageUrl.substring(0, 50) + '...');
            return imageUrl;
        }

        console.log('Image URL not found in expected format');
        return null;
    } catch (error) {
        console.error('Error generating product image:', error);
        return null;
    }
}
