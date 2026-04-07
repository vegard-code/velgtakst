import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { lagOAuth2Client, lagreToken } from '@/lib/integrasjoner/google-calendar'

/**
 * GET /api/auth/google/callback
 *
 * Google redirecter hit etter at brukeren har godkjent Calendar-tilgang.
 * 1. Validerer state (CSRF)
 * 2. Bytter authorization code mot tokens
 * 3. Lagrer tokens i google_calendar_tokens
 * 4. Redirecter tilbake til innstillinger
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirectBase = '/portal/takstmann/innstillinger'

  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=google_avbrutt`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=ugyldig_forespørsel`, request.url)
    )
  }

  const cookieStore = await cookies()
  const stateCookie = cookieStore.get('google_oauth_state')

  if (!stateCookie) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=ugyldig_state`, request.url)
    )
  }

  let savedState: { state: string; userId: string }
  try {
    savedState = JSON.parse(stateCookie.value)
  } catch {
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=ugyldig_state`, request.url)
    )
  }

  if (state !== savedState.state) {
    console.error('Google OAuth state mismatch')
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=ugyldig_state`, request.url)
    )
  }

  // Slett state-cookie
  cookieStore.delete('google_oauth_state')

  try {
    // Bytt code mot tokens
    const oauth2Client = lagOAuth2Client()
    console.log('Google OAuth: Exchanging code for tokens. Redirect URI:', process.env.GOOGLE_REDIRECT_URI ?? 'NOT SET')

    let tokens
    try {
      const tokenResponse = await oauth2Client.getToken(code)
      tokens = tokenResponse.tokens
    } catch (tokenErr: unknown) {
      const errMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr)
      console.error('Google OAuth token exchange failed:', errMsg)
      return NextResponse.redirect(
        new URL(`${redirectBase}?fane=integrasjoner&error=token_feil&detalj=${encodeURIComponent(errMsg)}`, request.url)
      )
    }

    if (!tokens.access_token) {
      throw new Error('Ingen access_token mottatt fra Google')
    }

    // Finn takstmann-profil for brukeren
    const supabase = await createServiceClient()
    const { data: takstmannProfil, error: profilError } = await supabase
      .from('takstmann_profiler')
      .select('id')
      .eq('user_id', savedState.userId)
      .maybeSingle()

    console.log('Google OAuth: Takstmann profil lookup:', { userId: savedState.userId, found: !!takstmannProfil, error: profilError?.message })

    if (!takstmannProfil) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?fane=integrasjoner&error=takstmann_ikke_funnet`, request.url)
      )
    }

    // Lagre tokens
    await lagreToken(takstmannProfil.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
      scope: tokens.scope ?? null,
      token_type: tokens.token_type ?? 'Bearer',
    })

    console.log('Google Calendar koblet til for takstmann:', takstmannProfil.id)

    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&success=google_tilkoblet`, request.url)
    )
  } catch (err) {
    console.error('Google OAuth callback feil:', err)
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=token_feil`, request.url)
    )
  }
}
