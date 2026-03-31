import { NextResponse } from 'next/server'
import { VIPPS_CONFIG } from '@/lib/vipps/config'

/**
 * GET /api/vipps/test
 *
 * Diagnostikk-endepunkt for å verifisere Vipps-oppsettet.
 * Sjekker:
 *   1. At alle miljøvariabler er satt
 *   2. At Vipps OIDC discovery-endepunktet svarer
 *   3. At vi kan parse autorisasjons-, token- og userinfo-URL
 *   4. (Valgfritt) At access-token-endepunktet svarer (krever gyldige nøkler)
 *
 * ⚠️ Kun for utvikling – bør fjernes eller beskyttes i produksjon!
 */
export async function GET() {
  // Kun tillatt i dev/test
  if (process.env.NODE_ENV === 'production' && !process.env.VIPPS_TEST_MODE) {
    return NextResponse.json({ error: 'Ikke tilgjengelig i produksjon' }, { status: 403 })
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: process.env.VIPPS_TEST_MODE === 'true' ? 'TEST (MT)' : 'PRODUKSJON',
  }

  // --- 1. Sjekk miljøvariabler ---
  const envVars = {
    VIPPS_CLIENT_ID: process.env.VIPPS_CLIENT_ID,
    VIPPS_CLIENT_SECRET: process.env.VIPPS_CLIENT_SECRET,
    VIPPS_SUBSCRIPTION_KEY: process.env.VIPPS_SUBSCRIPTION_KEY,
    VIPPS_MSN: process.env.VIPPS_MSN,
    VIPPS_TEST_MODE: process.env.VIPPS_TEST_MODE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  }

  const envStatus: Record<string, string> = {}
  let allEnvSet = true

  for (const [key, value] of Object.entries(envVars)) {
    if (!value || value.startsWith('din-')) {
      envStatus[key] = '❌ Ikke satt / placeholder'
      allEnvSet = false
    } else {
      // Vis bare de første tegnene for sikkerhet
      envStatus[key] = `✅ Satt (${value.substring(0, 4)}...)`
    }
  }

  results.miljøvariabler = {
    status: allEnvSet ? '✅ Alle satt' : '⚠️ Noen mangler',
    detaljer: envStatus,
  }

  // --- 2. Test OIDC Discovery ---
  try {
    const discoveryStart = Date.now()
    const discoveryRes = await fetch(VIPPS_CONFIG.discoveryUrl, {
      cache: 'no-store',
    })
    const discoveryTime = Date.now() - discoveryStart

    if (discoveryRes.ok) {
      const discovery = await discoveryRes.json()
      results.oidcDiscovery = {
        status: '✅ OK',
        url: VIPPS_CONFIG.discoveryUrl,
        responstid: `${discoveryTime}ms`,
        endepunkter: {
          authorization: discovery.authorization_endpoint ?? '❌ Mangler',
          token: discovery.token_endpoint ?? '❌ Mangler',
          userinfo: discovery.userinfo_endpoint ?? '❌ Mangler',
          jwks: discovery.jwks_uri ?? '❌ Mangler',
        },
        støttede_scopes: discovery.scopes_supported ?? [],
        støttede_response_types: discovery.response_types_supported ?? [],
      }
    } else {
      results.oidcDiscovery = {
        status: `❌ Feil (HTTP ${discoveryRes.status})`,
        url: VIPPS_CONFIG.discoveryUrl,
        responstid: `${discoveryTime}ms`,
      }
    }
  } catch (err) {
    results.oidcDiscovery = {
      status: '❌ Kunne ikke nå Vipps',
      feil: err instanceof Error ? err.message : String(err),
      url: VIPPS_CONFIG.discoveryUrl,
    }
  }

  // --- 3. Test access token (kun hvis nøkler er satt) ---
  if (allEnvSet) {
    try {
      const baseUrl = process.env.VIPPS_TEST_MODE === 'true'
        ? 'https://apitest.vipps.no'
        : 'https://api.vipps.no'

      const tokenStart = Date.now()
      const tokenRes = await fetch(`${baseUrl}/accesstoken/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          client_id: process.env.VIPPS_CLIENT_ID!,
          client_secret: process.env.VIPPS_CLIENT_SECRET!,
          'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
          'Merchant-Serial-Number': process.env.VIPPS_MSN!,
        },
      })
      const tokenTime = Date.now() - tokenStart

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json()
        results.accessToken = {
          status: '✅ Autentisering OK!',
          responstid: `${tokenTime}ms`,
          utløper_om: `${tokenData.expires_in} sekunder`,
        }
      } else {
        const errBody = await tokenRes.text()
        results.accessToken = {
          status: `❌ Autentisering feilet (HTTP ${tokenRes.status})`,
          responstid: `${tokenTime}ms`,
          feil: errBody,
          tips: 'Sjekk at CLIENT_ID, CLIENT_SECRET, SUBSCRIPTION_KEY og MSN er riktige for testmiljøet.',
        }
      }
    } catch (err) {
      results.accessToken = {
        status: '❌ Nettverksfeil',
        feil: err instanceof Error ? err.message : String(err),
      }
    }
  } else {
    results.accessToken = {
      status: '⏭️ Hoppet over – mangler miljøvariabler',
      tips: 'Sett inn ekte test-nøkler fra portal.vipps.no i .env.local',
    }
  }

  // --- 4. Konfigurasjon-sammendrag ---
  results.konfigurasjon = {
    redirectUri: VIPPS_CONFIG.redirectUri,
    scopes: VIPPS_CONFIG.scopes,
    tips: [
      'Sørg for at redirect URI er registrert i Vipps-portalen: ' + VIPPS_CONFIG.redirectUri,
      'For testing lokalt: bruk ngrok eller lignende for å eksponere localhost',
      'Test-brukere: bruk Vipps MT test-app (egen app for testmiljø)',
    ],
  }

  return NextResponse.json(results, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
