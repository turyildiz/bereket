import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/service'
import { TransactionalEmailsApi, SendSmtpEmail } from '@getbrevo/brevo'
import crypto from 'crypto'

// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number, lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5; // Max 5 attempts per hour per IP

// Helper function to get Brevo API instance
function getBrevoApiInstance() {
  const apiInstance = new TransactionalEmailsApi()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ; (apiInstance as any).authentications.apiKey.apiKey = process.env.BREVO_API_KEY!
  return apiInstance
}

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting Check
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const record = rateLimit.get(ip) || { count: 0, lastReset: now };

    if (now - record.lastReset > RATE_LIMIT_WINDOW) {
      record.count = 0;
      record.lastReset = now;
    }

    if (record.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' },
        { status: 429 }
      )
    }

    record.count++;
    rateLimit.set(ip, record);

    // Safety cleanup to prevent memory leaks in long-running instances
    if (rateLimit.size > 1000) {
      rateLimit.clear();
    }

    const body = await request.json()
    const { email, website } = body

    // Honeypot check
    if (website) {
      // Return fake success for bots
      return NextResponse.json(
        { message: 'Vielen Dank! Bitte überprüfe dein E-Mail-Postfach und bestätige deine Anmeldung.' },
        { status: 200 }
      )
    }

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'E-Mail-Adresse ist erforderlich.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Bitte gib eine gültige E-Mail-Adresse ein.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Use service_role client to bypass RLS (newsletter_subscribers has no anon write access)
    const supabase = createServiceClient()

    // Check if email already exists
    const { data: existingSubscriber, error: checkError } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_confirmed')
      .eq('email', normalizedEmail)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected for new subscribers
      console.error('Error checking subscriber:', checkError)
      return NextResponse.json(
        { error: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' },
        { status: 500 }
      )
    }

    if (existingSubscriber) {
      if (existingSubscriber.is_confirmed) {
        return NextResponse.json(
          { message: 'Du bist bereits für unseren Newsletter angemeldet!' },
          { status: 200 }
        )
      } else {
        return NextResponse.json(
          { message: 'Du bist bereits für unseren Newsletter vorgemerkt! Bitte überprüfe dein E-Mail-Postfach.' },
          { status: 200 }
        )
      }
    }

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Insert new subscriber
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: normalizedEmail,
        is_confirmed: false,
        confirmation_token: confirmationToken,
        token_expires_at: tokenExpiry.toISOString(),
      })

    if (insertError) {
      console.error('Error inserting subscriber:', insertError)
      return NextResponse.json(
        { error: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' },
        { status: 500 }
      )
    }

    // Build confirmation URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const confirmationUrl = `${baseUrl}/api/newsletter/confirm?token=${confirmationToken}`

    // Send Double Opt-In email via Brevo
    const sendSmtpEmail = new SendSmtpEmail()
    sendSmtpEmail.to = [{ email: normalizedEmail }]
    sendSmtpEmail.sender = {
      name: 'Bereket Market',
      email: 'turgay@nettmedia.de',
    }
    sendSmtpEmail.subject = 'Bestätige deine Newsletter-Anmeldung'
    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FAF7F2;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF7F2;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #E6A845; border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Bereket Market</h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 14px;">Dein orientalischer Marktplatz</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #2C2823; font-size: 24px; font-weight: 600;">
                Willkommen! 👋
              </h2>
              <p style="margin: 0 0 20px; color: #5c5c5c; font-size: 16px; line-height: 1.6;">
                Vielen Dank für dein Interesse an unserem Newsletter! Um deine Anmeldung abzuschließen, klicke bitte auf den Button unten.
              </p>
              <p style="margin: 0 0 30px; color: #5c5c5c; font-size: 16px; line-height: 1.6;">
                Mit unserem Newsletter erhältst du:
              </p>
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #5c5c5c; font-size: 16px; line-height: 1.8;">
                <li>Exklusive Angebote und Rabatte</li>
                <li>Neue Märkte in deiner Nähe</li>
                <li>Saisonale Highlights und Rezeptideen</li>
              </ul>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${confirmationUrl}"
                       style="display: inline-block; padding: 16px 40px; background-color: #E6A845; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 50px;">
                      Anmeldung bestätigen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                Falls du dich nicht für unseren Newsletter angemeldet hast, kannst du diese E-Mail einfach ignorieren.
              </p>
              <p style="margin: 15px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                Der Link ist 24 Stunden gültig.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f5f0; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Bereket Market. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 12px;">
                <a href="${baseUrl}/datenschutz" style="color: #E6A845; text-decoration: none;">Datenschutz</a> ·
                <a href="${baseUrl}/impressum" style="color: #E6A845; text-decoration: none;">Impressum</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    try {
      const apiInstance = getBrevoApiInstance()
      await apiInstance.sendTransacEmail(sendSmtpEmail)
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Delete the subscriber if email fails
      await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('email', normalizedEmail)

      return NextResponse.json(
        { error: 'Die Bestätigungs-E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Vielen Dank! Bitte überprüfe dein E-Mail-Postfach und bestätige deine Anmeldung.'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.' },
      { status: 500 }
    )
  }
}
