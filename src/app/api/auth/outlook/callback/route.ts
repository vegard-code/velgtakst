import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { byttKodeMedTokens, lagreToken } from '@/lib/integrasjoner/outlook-calendar'

/**
 * GET /api/auth/outlook/callback
 *
 * Microsoft redirecter hit etter at brukeren har godkjent Calendar-tilgang.
 * 1. Validerer state (CSRF)
 * 2. Bytter authorization code mot tokens
 * 3. Lagrer tokens i outlook_calendar_tokens
 * 4. Redirecter tilbake til innstillinger
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirectBase = '/portal/takstmann/innstillinger'

  if (error) {
    console.error('Outlook OAuth error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=outlook_avbrutt`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=ugyldig_forespørsel`, request.url)
    )
  }

  const cookieStore = await cookies()
  const stateCookie = cookieStore.get('outlook_oauth_state')

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
    console.error('Outlook OAuth state mismatch')
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=ugyldig_state`, request.url)
    )
  }

  // Slett state-cookie
  cookieStore.delete('outlook_oauth_state')

  try {
    // Bytt code mot tokens
    console.log('Outlook OAuth: Exchanging code for tokens. Redirect URI:', process.env.OUTLOOK_REDIRECT_URI ?? 'NOT SET')

    let tokens
    try {
      tokens = await byttKodeMedTokens(code)
    } catch (tokenErr: unknown) {
      const errMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr)
      console.error('Outlook OAuth token exchange failed:', errMsg)
      return NextResponse.redirect(
        new URL(`${redirectBase}?fane=integrasjoner&error=token_feil&detalj=${encodeURIComponent(errMsg)}`, request.url)
      )
    }

    if (!tokens.access_token) {
      throw new Error('Ingen access_token mottatt fra Microsoft')
    }

    // Finn takstmann-profil for brukeren
    const supabase = await createServiceClient()
    const { data: takstmannProfil, error: profilError } = await supabase
      .from('takstmann_profiler')
      .select('id')
      .eq('user_id', savedState.userId)
      .single()

    console.log('Outlook OAuth: Takstmann profil lookup:', { userId: savedState.userId, found: !!takstmannProfil, error: profilError?.message })

    if (!takstmannProfil) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?fane=integrasjoner&error=takstmann_ikke_funnet`, request.url)
      )
    }

    // Lagre tokens
    await lagreToken(takstmannProfil.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_in: tokens.expires_in ?? null,
      scope: tokens.scope ?? null,
      token_type: tokens.token_type ?? 'Bearer',
    })

    console.log('Outlook Calendar koblet til for takstmann:', takstmannProfil.id)

    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&success=outlook_tilkoblet`, request.url)
    )
  } catch (err) {
    console.error('Outlook OAuth callback feil:', err)
    return NextResponse.redirect(
      new URL(`${redirectBase}?fane=integrasjoner&error=token_feil`, request.url)
    )
  }
}
