import OpenAI from 'openai';

// Initialize OpenAI client configured for OpenRouter
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
});

// Type definition for the AI response
export interface OfferAnalysis {
    product_name: string;
    price: string;
    unit: string;
    description: string;
    ai_category: string;
}

/**
 * Analyze a WhatsApp offer message using AI
 * @param caption - The text caption from the WhatsApp message
 * @param imageUrl - Optional URL to the product image
 * @returns Parsed offer data with product_name, price, description, and ai_category
 */
export async function analyzeOffer(caption: string, imageUrl?: string): Promise<OfferAnalysis | null> {
    try {
        const systemPrompt = `You are an assistant for a supermarket. Given a WhatsApp message caption and an image, return a JSON object with the following fields:

- "product_name": A clean product name in German (e.g., "Zitronen", "Rinderhackfleisch"). Do NOT include quantity or price in the name.

- "price": The numerical price as a CLEAN NUMBER STRING only (e.g., "0.38", "1.99", "4.99"). Extract ONLY the number, no currency symbols or units.

- "unit": Your PRIMARY GOAL is to extract the EXACT unit the user mentioned. Look carefully for words like "kg", "Gramm", "g", "Liter", "L", "Bund", "Packung", "Stück", or quantity+unit combinations near the price. Include the quantity if specified.

UNIT EXTRACTION EXAMPLES:
- "Ingwer 100 Gramm 0.38€" → unit: "100 Gramm"
- "Orangen 1.99€ kg" → unit: "kg"
- "Zitronen 3 Stück 1.00" → unit: "3 Stück"
- "Tomaten 500g 2.49" → unit: "500g"
- "Petersilie 1 Bund 0.99" → unit: "Bund"
- "Milch 1L 1.29" → unit: "1L"
- "Äpfel 2kg 3.99" → unit: "2kg"
- "Milch 1.20" → unit: "Stück" (DEFAULT only if absolutely NO unit is found)

- "description": A short, appetizing one-sentence description in German that would make customers want to buy the product.

- "ai_category": A category for the product. Use one of these: "Obst & Gemüse", "Fleisch & Wurst", "Milchprodukte", "Backwaren", "Getränke", "Süßigkeiten", "Tiefkühl", "Konserven", "Gewürze", "Haushalt", "Sonstiges"

Return ONLY the raw JSON object. Do NOT use markdown code blocks, backticks, or any preamble like "Here is your JSON". Start your response with { and end it with }.`;


        // Build the message content based on whether we have an image
        const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
            {
                type: 'text',
                text: `Caption: ${caption}`
            }
        ];

        // Add image if provided
        if (imageUrl) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: imageUrl
                }
            });
        }

        const response = await openai.chat.completions.create({
            model: 'google/gemini-2.0-flash-001',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userContent
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3, // Lower temperature for more consistent parsing
            max_tokens: 500
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
            console.error('No content in AI response');
            return null;
        }

        // Clean the response string (remove any potential markdown artifacts)
        const cleanContent = content.replace(/```json|```/g, '').trim();

        // Parse the JSON response
        const parsed = JSON.parse(cleanContent) as OfferAnalysis;

        console.log('AI Analysis:', parsed);
        return parsed;

    } catch (error) {
        console.error('Error analyzing offer with AI:', error);
        return null;
    }
}
