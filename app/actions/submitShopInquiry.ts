'use server';

import { Resend } from 'resend';
import { headers } from 'next/headers';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ShopInquiryData {
    shopName: string;
    ownerName: string;
    email: string;
    phone: string;
    city: string;
    message: string;
    // Honeypot field - should be empty
    website?: string;
}

// Simple in-memory rate limit cache
// Note: In a production serverless environment (like Vercel), this cache is not shared across instances
// and resets on cold starts. For robust rate limiting, use Redis (Upstash) or a Database.
const rateLimitCache = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS = 3; // 3 requests per hour

export async function submitShopInquiry(formData: ShopInquiryData) {
    const { shopName, ownerName, email, phone, city, message, website } = formData;

    // 1. Honeypot Check
    // If the hidden 'website' field is filled, it's likely a bot.
    // We return success to trick the bot.
    if (website && website.length > 0) {
        console.log(`Bot blocked via honeypot. IP: unknown (honeypot match)`);
        return { success: true, data: { id: 'mock-id' } }; // Fake success
    }

    // 2. Rate Limiting
    try {
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for') || 'unknown-ip';

        const now = Date.now();
        const record = rateLimitCache.get(ip);

        if (record) {
            if (now - record.windowStart < RATE_LIMIT_WINDOW) {
                if (record.count >= MAX_REQUESTS) {
                    console.log(`Rate limit exceeded for IP: ${ip}`);
                    return { success: true, data: { id: 'mock-id' } }; // Fake success to avoid leaking info
                }
                record.count++;
            } else {
                // Window expired, reset
                record.count = 1;
                record.windowStart = now;
            }
        } else {
            // New record
            rateLimitCache.set(ip, { count: 1, windowStart: now });
        }

        // Cleanup old entries periodically (optional optimization for long-running processes)
        if (rateLimitCache.size > 1000) {
            const expiry = now - RATE_LIMIT_WINDOW;
            for (const [key, value] of rateLimitCache.entries()) {
                if (value.windowStart < expiry) {
                    rateLimitCache.delete(key);
                }
            }
        }

    } catch (error) {
        console.error('Rate limiting check failed:', error);
        // Continue anyway if rate limiting fails (fail open) vs fail closed
    }

    try {
        const data = await resend.emails.send({
            from: 'Bereket Market <info@bereket.market>',
            to: ['info@bereket.market'],
            replyTo: email,
            subject: `Neue Shop-Anfrage: ${shopName}`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 30px;">
                         <img src="https://bereket-market.vercel.app/logo.png" alt="Bereket Market" style="height: 50px; width: auto;">
                    </div>

                    <h2 style="color: #2C2823; font-size: 24px; border-bottom: 2px solid #E18B55; padding-bottom: 15px; margin-bottom: 25px;">Neue Shop-Anfrage eingegangen</h2>
                    
                    <div style="background-color: #fdf8f6; padding: 25px; border-radius: 12px; border: 1px solid #efe5de;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; color: #666; width: 140px; font-weight: bold;">Shop Name:</td>
                                <td style="padding: 10px 0; color: #2C2823; font-size: 16px;">${shopName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #666; font-weight: bold;">Ansprechpartner:</td>
                                <td style="padding: 10px 0; color: #2C2823; font-size: 16px;">${ownerName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #666; font-weight: bold;">Standort:</td>
                                <td style="padding: 10px 0; color: #2C2823;">${city}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #666; font-weight: bold;">E-Mail:</td>
                                <td style="padding: 10px 0; color: #E18B55;"><a href="mailto:${email}" style="color: #E18B55; text-decoration: none;">${email}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #666; font-weight: bold;">Telefon:</td>
                                <td style="padding: 10px 0; color: #2C2823;">${phone}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="margin-top: 30px;">
                        <h3 style="color: #2C2823; font-size: 18px; margin-bottom: 15px;">Nachricht des Händlers:</h3>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message || "Keine Nachricht eingegeben."}</div>
                    </div>

                    <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; text-align: center;">
                        <p>Diese E-Mail wurde automatisch über das Kontaktformular auf <a href="https://bereket.market" style="color: #9ca3af; text-decoration: underline;">bereket.market</a> gesendet.</p>
                    </div>
                </div>
            `,
        });

        return { success: true, data };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: (error as Error).message };
    }
}
