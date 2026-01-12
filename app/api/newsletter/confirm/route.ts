import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  if (!token) {
    return NextResponse.redirect(
      `${baseUrl}?newsletter=error&message=invalid-token`
    )
  }

  try {
    // Find subscriber by token
    const { data: subscriber, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, is_confirmed, token_expires_at')
      .eq('confirmation_token', token)
      .single()

    if (findError || !subscriber) {
      console.error('Subscriber not found:', findError)
      return NextResponse.redirect(
        `${baseUrl}?newsletter=error&message=invalid-token`
      )
    }

    // Check if already confirmed
    if (subscriber.is_confirmed) {
      return NextResponse.redirect(
        `${baseUrl}?newsletter=already-confirmed`
      )
    }

    // Check if token has expired
    const tokenExpiry = new Date(subscriber.token_expires_at)
    if (tokenExpiry < new Date()) {
      return NextResponse.redirect(
        `${baseUrl}?newsletter=error&message=expired-token`
      )
    }

    // Confirm the subscription
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmation_token: null, // Clear token after use
        token_expires_at: null,
      })
      .eq('id', subscriber.id)

    if (updateError) {
      console.error('Error confirming subscription:', updateError)
      return NextResponse.redirect(
        `${baseUrl}?newsletter=error&message=confirmation-failed`
      )
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${baseUrl}?newsletter=confirmed`
    )

  } catch (error) {
    console.error('Newsletter confirmation error:', error)
    return NextResponse.redirect(
      `${baseUrl}?newsletter=error&message=unexpected-error`
    )
  }
}
