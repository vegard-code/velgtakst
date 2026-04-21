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
 * 5. Sikrer at user_profile og rolle-profil finnes
 * 6. Logger brukeren inn og redirecter til portalen
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
    const email = vippsUser.email as string
    const navn = vippsUser.name as string || `${vippsUser.given_name ?? ''} ${vippsUser.family_name ?? ''}`.trim()
    const telefon = vippsUser.phone_number as string | undefined
    const vippsSub = vippsUser.sub as string

    if (!email) {
      return NextResponse.redirect(new URL('/logg-inn?error=mangler_epost', request.url))
    }

    // --- 3. Finn eller opprett bruker i Supabase ---
    const supabaseAdmin = await createServiceClient()

    // Sjekk om brukeren allerede finnes
    // 1) Først: sjekk via vipps_sub i user_metadata (mest presis)
    // 2) Fallback: sjekk via epost
    let existingUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | undefined

    // Søk via vipps_sub i alle brukere (paginert for å støtte >1000 brukere)
    let page = 1
    let found = false
    while (!found) {
      const { data: batch } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 500,
      })
      if (!batch?.users || batch.users.length === 0) break

      // Sjekk for vipps_sub match
      const subMatch = batch.users.find(
        (u) => u.user_metadata?.vipps_sub === vippsSub
      )
      if (subMatch) {
        existingUser = subMatch
        found = true
        break
      }

      // Sjekk for email match (kun hvis vi ikke allerede har funnet via sub)
      if (!existingUser) {
        const emailMatch = batch.users.find((u) => u.email === email)
        if (emailMatch) {
          existingUser = emailMatch
        }
      }

      // Hvis vi har hentet alle brukere, stopp
      if (batch.users.length < 500) break
      page++
    }

    // Rollen brukeren valgte på innloggingssiden (eller default privatkunde)
    const valgtRolle = savedState.rolle || 'privatkunde'

    let userId: string

    if (existingUser) {
      userId = existingUser.id

      // Oppdater Vipps-sub i metadata + synkroniser epost hvis endret i Vipps
      const updateData: { user_metadata: Record<string, unknown>; email?: string } = {
        user_metadata: {
          ...existingUser.user_metadata,
          vipps_sub: vippsSub,
        },
      }
      // Hvis brukerens epost i Vipps er annerledes (f.eks. endret epost i Vipps),
      // oppdater eposten i Supabase også, men kun for brukere funnet via vipps_sub
      if (existingUser.email !== email && existingUser.user_metadata?.vipps_sub === vippsSub) {
        updateData.email = email
      }
      await supabaseAdmin.auth.admin.updateUserById(userId, updateData)

      // VIKTIG: Sjekk om user_profile finnes — opprett hvis den mangler
      const { data: eksisterendeProfil } = await supabaseAdmin
        .from('user_profiles')
        .select('rolle')
        .eq('id', userId)
        .single()

      if (!eksisterendeProfil) {
        await opprettProfiler(supabaseAdmin, userId, valgtRolle, navn, email, telefon)
      } else {
        // Merk takstmann-profilen som Vipps-verifisert
        if (eksisterendeProfil.rolle === 'takstmann_admin' || eksisterendeProfil.rolle === 'takstmann') {
          await supabaseAdmin
            .from('takstmann_profiler')
            .update({ vipps_verifisert: true })
            .eq('user_id', userId)
        }
      }
    } else {
      // Ny bruker
      const randomPassword = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')

      const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          navn,
          rolle: valgtRolle,
          vipps_sub: vippsSub,
          registrert_via: 'vipps',
        },
      })

      if (createError || !newAuth.user) {
        console.error('Supabase create user error:', createError)
        return NextResponse.redirect(new URL('/logg-inn?error=opprett_bruker_feil', request.url))
      }

      userId = newAuth.user.id

      await opprettProfiler(supabaseAdmin, userId, valgtRolle, navn, email, telefon)

      // Sjekk om ny Vipps-bruker ser ut som duplikat av en eksisterende bruker,
      // basert på navn eller telefon. Logger i admin_hendelse_logg slik at admin
      // kan finne dem på /portal/admin/duplikater og evt. merge.
      await loggMuligDuplikat(supabaseAdmin, userId, navn, telefon)
    }

    // --- 4. Bestem riktig redirect basert på faktisk rolle ---
    const { data: profilData } = await supabaseAdmin
      .from('user_profiles')
      .select('rolle')
      .eq('id', userId)
      .single()

    const faktiskRolle = (profilData as { rolle?: string } | null)?.rolle ?? 'privatkunde'

    // For admin-brukere: bruk valgt rolle fra innloggingssiden for redirect
    // (admin har tilgang til alle portaler via middleware)
    const rolleForRedirect = faktiskRolle === 'admin' ? valgtRolle : faktiskRolle
    let redirectUrl: string

    if (rolleForRedirect === 'takstmann_admin' || rolleForRedirect === 'takstmann') {
      redirectUrl = '/portal/takstmann'
    } else if (rolleForRedirect === 'megler') {
      redirectUrl = '/portal/megler'
    } else if (rolleForRedirect === 'privatkunde') {
      // Bruk savedState.redirect for å sende tilbake til siden brukeren kom fra (f.eks. takstmann-profil)
      const safeRedirect = savedState.redirect &&
        savedState.redirect.startsWith('/') &&
        !savedState.redirect.startsWith('//')
      redirectUrl = safeRedirect ? savedState.redirect : '/portal/kunde'
    } else if (faktiskRolle === 'admin') {
      redirectUrl = '/portal/admin'
    } else {
      redirectUrl = '/portal/kunde'
    }

    // --- 5. Generer en Supabase-session for brukeren ---
    // Bruk brukerens registrerte e-post i Supabase (kan være annerledes enn Vipps-eposten)
    const { data: freshUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    const sessionEmail = freshUser?.user?.email ?? email

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: sessionEmail,
    })

    if (linkError || !linkData) {
      console.error('Generate link error:', linkError)
      return NextResponse.redirect(new URL('/logg-inn?error=session_feil', request.url))
    }

    const hashed_token = linkData.properties.hashed_token

    // Sett opp response med redirect
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
              response.cookies.set(name, value, options as Record<string, unknown>)
            })
          },
        },
      }
    )

    // Verifiser OTP for å opprette session
    const { error: otpError } = await supabaseWithCookies.auth.verifyOtp({
      type: 'magiclink',
      token_hash: hashed_token,
    })

    if (otpError) {
      // Fallback: prøv med email-type
      const { error: otpError2 } = await supabaseWithCookies.auth.verifyOtp({
        type: 'email',
        token_hash: hashed_token,
      })
      if (otpError2) {
        console.error('OTP verification failed:', otpError.message, otpError2.message)
        return NextResponse.redirect(new URL('/logg-inn?error=session_feil', request.url))
      }
    }

    return response
  } catch (err) {
    console.error('Vipps callback error:', err)
    return NextResponse.redirect(new URL('/logg-inn?error=ukjent_feil', request.url))
  }
}

/**
 * Oppretter user_profile + rolle-spesifikk profil for en bruker.
 */
async function opprettProfiler(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  rolle: string,
  navn: string,
  email: string,
  telefon?: string
) {
  if (rolle === 'takstmann_admin' || rolle === 'takstmann') {
    const { data: company } = await supabase
      .from('companies')
      .insert({ navn: `${navn}s firma`, epost: email })
      .select('id')
      .single()

    if (company) {
      await supabase.from('user_profiles').insert({
        id: userId,
        company_id: company.id,
        rolle: 'takstmann_admin',
        navn,
        telefon: telefon || null,
      })

      await supabase.from('takstmann_profiler').insert({
        user_id: userId,
        company_id: company.id,
        navn,
        telefon: telefon || null,
        epost: email,
        vipps_verifisert: true,
      })
    }
  } else if (rolle === 'megler') {
    await supabase.from('user_profiles').insert({
      id: userId,
      rolle: 'megler',
      navn,
      telefon: telefon || null,
    })

    await supabase.from('megler_profiler').insert({
      user_id: userId,
      navn,
      telefon: telefon || null,
      epost: email,
    })
  } else {
    // Privatkunde (standard)
    await supabase.from('user_profiles').insert({
      id: userId,
      rolle: 'privatkunde',
      navn,
      telefon: telefon || null,
    })

    await supabase.from('privatkunde_profiler').insert({
      user_id: userId,
      navn,
      telefon: telefon || null,
      epost: email,
    })
  }
}

/**
 * Normaliser navn for duplikat-sammenligning: lowercase, fjern alt
 * annet enn bokstaver og tall. Fanger varianter som "Geir-Jonny",
 * "Geir Jonny", "geir_jonny".
 */
function normNavn(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().normalize('NFKD').replace(/[^a-zæøå0-9]/g, '')
}

/**
 * Normaliser telefon: behold kun siffer, ta de siste 8 (for å fange
 * varianter med/uten +47).
 */
function normTlf(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/\D/g, '').slice(-8)
}

/**
 * Etter opprettelse av ny Vipps-bruker: sjekk om noen eksisterende
 * brukere har samme normaliserte navn eller telefon. Hvis ja, logg
 * i admin_hendelse_logg så admin kan følge opp.
 */
async function loggMuligDuplikat(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  nyUserId: string,
  navn: string,
  telefon?: string,
) {
  const nyNavn = normNavn(navn)
  const nyTlf = normTlf(telefon)
  if (!nyNavn && !nyTlf) return

  const [takstResp, meglerResp, kundeResp] = await Promise.all([
    supabase.from('takstmann_profiler').select('user_id, navn, telefon'),
    supabase.from('megler_profiler').select('user_id, navn, telefon'),
    supabase.from('privatkunde_profiler').select('user_id, navn, telefon'),
  ])

  const alle = [
    ...(takstResp.data ?? []),
    ...(meglerResp.data ?? []),
    ...(kundeResp.data ?? []),
  ] as { user_id: string | null; navn: string | null; telefon: string | null }[]

  const matcher = new Set<string>()
  for (const rad of alle) {
    if (!rad.user_id || rad.user_id === nyUserId) continue
    const annetNavn = normNavn(rad.navn)
    const annetTlf = normTlf(rad.telefon)
    if (nyNavn && annetNavn === nyNavn) {
      matcher.add(rad.user_id)
    } else if (nyTlf && annetTlf === nyTlf) {
      matcher.add(rad.user_id)
    }
  }

  if (matcher.size === 0) return

  await supabase.from('admin_hendelse_logg').insert({
    admin_user_id: nyUserId,
    hendelse_type: 'mulig_duplikat_ved_vipps_registrering',
    target_id: nyUserId,
    target_type: 'user',
    detaljer: {
      ny_bruker_id: nyUserId,
      ny_navn: navn,
      ny_telefon: telefon ?? null,
      mulige_matchende_bruker_ids: Array.from(matcher),
    },
  })
}
