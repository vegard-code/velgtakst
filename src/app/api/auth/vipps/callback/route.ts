import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { VIPPS_CONFIG, getDiscoveryDocument } from '@/lib/vipps/config'
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

/**
 * GET /api/auth/vipps/callback
 *
 * Vipps redirecter hit etter at brukeren har godkjent innlogging.
 * 1. Validerer state
 * 2. Bytter authorization code mot tokens
 * 3. Henter brukerinfo fra Vipps
 * 4. Oppretter eller finner bruker i Supabase
 * 5. Logger brukeren inn og redirecter til portalen
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const authCookie = cookieStore.get('vipps_auth')

  // Feilhåndtering
  if (error) {
    console.error('Vipps login error:', error, searchParams.get('error_description'))
    return NextResponse.redirect(new URL('/logg-inn?error=vipps_avbrutt', request.url))
  }

  if (!code || !state || !authCookie) {
    return NextResponse.redirect(new URL('/logg-inn?error=ugyldig_forespørsel', request.url))
  }

  let savedState: {
    state: string
    codeVerifier: string
    rolle: string
    redirect: string
  }

  try {
    savedState = JSON.parse(authCookie.value)
  } catch {
    return NextResponse.redirect(new URL('/logg-inn?error=ugyldig_forespørsel', request.url))
  }

  // CSRF-sjekk
  if (state !== savedState.state) {
    return NextResponse.redirect(new URL('/logg-inn?error=ugyldig_state', request.url))
  }

  // Slett auth-cookien
  cookieStore.delete('vipps_auth')

  try {
    // Hent OIDC-endepunkter
    const discovery = await getDiscoveryDocument()

    // --- 1. Bytt code mot tokens ---
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${VIPPS_CONFIG.clientId}:${VIPPS_CONFIG.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: VIPPS_CONFIG.redirectUri,
        code_verifier: savedState.codeVerifier,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Vipps token exchange failed:', err)
      return NextResponse.redirect(new URL('/logg-inn?error=token_feil', request.url))
    }

    const tokens = await tokenRes.json()

    // --- 2. Hent brukerinfo ---
    const userInfoRes = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userInfoRes.ok) {
      console.error('Vipps userinfo failed:', await userInfoRes.text())
      return NextResponse.redirect(new URL('/logg-inn?error=brukerinfo_feil', request.url))
    }

    const vippsUser = await userInfoRes.json()
    // vippsUser inneholder: sub, name, email, phone_number, etc.

    const email = vippsUser.email as string
    const navn = vippsUser.name as string || `${vippsUser.given_name ?? ''} ${vippsUser.family_name ?? ''}`.trim()
    const telefon = vippsUser.phone_number as string | undefined
    const vippsSub = vippsUser.sub as string

    if (!email) {
      return NextResponse.redirect(new URL('/logg-inn?error=mangler_epost', request.url))
    }

    // --- 3. Finn eller opprett bruker i Supabase ---
    const supabaseAdmin = await createServiceClient()

    // Sjekk om brukeren allerede finnes (via epost)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    )

    let userId: string

    if (existingUser) {
      // Bruker finnes – oppdater Vipps-sub i metadata
      userId = existingUser.id
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          vipps_sub: vippsSub,
        },
      })
    } else {
      // Ny bruker – opprett med Vipps-info
      const rolle = savedState.rolle || 'privatkunde'
      const randomPassword = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')

      const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          navn,
          rolle,
          vipps_sub: vippsSub,
          registrert_via: 'vipps',
        },
      })

      if (createError || !newAuth.user) {
        console.error('Supabase create user error:', createError)
        return NextResponse.redirect(new URL('/logg-inn?error=opprett_bruker_feil', request.url))
      }

      userId = newAuth.user.id

      // Opprett profiler basert på rolle
      if (rolle === 'takstmann_admin' || rolle === 'takstmann') {
        // For takstmenn – opprett company + profiler
        const { data: company } = await supabaseAdmin
          .from('companies')
          .insert({ navn: `${navn}s firma`, epost: email })
          .select('id')
          .single()

        if (company) {
          await supabaseAdmin.from('user_profiles').insert({
            id: userId,
            company_id: company.id,
            rolle: 'takstmann_admin',
            navn,
            telefon: telefon || null,
          })

          await supabaseAdmin.from('takstmann_profiler').insert({
            user_id: userId,
            company_id: company.id,
            navn,
            telefon: telefon || null,
            epost: email,
          })
        }
      } else if (rolle === 'megler') {
        await supabaseAdmin.from('user_profiles').insert({
          id: userId,
          rolle: 'megler',
          navn,
          telefon: telefon || null,
        })

        await supabaseAdmin.from('megler_profiler').insert({
          user_id: userId,
          navn,
          telefon: telefon || null,
          epost: email,
        })
      } else {
        // Privatkunde (standard)
        await supabaseAdmin.from('user_profiles').insert({
          id: userId,
          rolle: 'privatkunde',
          navn,
          telefon: telefon || null,
        })

        await supabaseAdmin.from('privatkunde_profiler').insert({
          user_id: userId,
          navn,
          telefon: telefon || null,
          epost: email,
        })
      }
    }

    // --- 4. Generer en Supabase-session for brukeren ---
    // Vi bruker generateLink for å lage en magic link, som vi setter som session
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (linkError || !linkData) {
      console.error('Generate link error:', linkError)
      return NextResponse.redirect(new URL('/logg-inn?error=session_feil', request.url))
    }

    // Hent token_hash fra linken og bruk den til å verifisere OTP
    const linkUrl = new URL(linkData.properties.action_link)
    const tokenHash = linkUrl.searchParams.get('token_hash') ?? linkUrl.hash

    // Sett opp en response med redirect
    const redirectUrl = savedState.redirect || '/portal'

    // Bruk Supabase server client med cookies for å verifisere OTP
    // Dette setter session-cookies automatisk
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))

    const supabaseWithCookies = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Verifiser OTP for å opprette session
    const hashed_token = linkData.properties.hashed_token
    await supabaseWithCookies.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashed_token,
    })

    return response
  } catch (err) {
    console.error('Vipps callback error:', err)
    return NextResponse.redirect(new URL('/logg-inn?error=ukjent_feil', request.url))
  }
}
