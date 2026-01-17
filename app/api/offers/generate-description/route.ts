import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
});

export async function POST(request: NextRequest) {
    try {
        const { product_name, price, unit } = await request.json();

        if (!product_name || !price || !unit) {
            return NextResponse.json(
                { error: 'Missing required fields: product_name, price, unit' },
                { status: 400 }
            );
        }

        const response = await openai.chat.completions.create({
            model: 'google/gemini-3-flash-preview',
            messages: [
                {
                    role: 'system',
                    content: `You are a German copywriter for a grocery store. Generate a short, appetizing ONE sentence description for a product offer.

Rules:
- Write in German
- Maximum 15 words
- Make it appetizing and appealing
- Match the plural/singular form of the product name
- Don't mention the price in the description
- Focus on freshness, quality, or taste

Return ONLY the description text, nothing else.`,
                },
                {
                    role: 'user',
                    content: `Product: ${product_name}
Price: ${price}€ / ${unit}

Generate a short German description.`,
                },
            ],
            temperature: 0.7,
            max_tokens: 100,
        });

        const description = response.choices[0]?.message?.content?.trim();

        if (!description) {
            return NextResponse.json(
                { error: 'Failed to generate description' },
                { status: 500 }
            );
        }

        return NextResponse.json({ description });
    } catch (error) {
        console.error('Error generating description:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
