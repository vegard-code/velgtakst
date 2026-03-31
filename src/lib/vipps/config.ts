/**
 * Vipps Login – OIDC-konfigurasjon
 *
 * Vipps bruker standard OpenID Connect.
 * Discovery-endepunktet returnerer authorization, token og userinfo-URLer.
 */

const isTest = process.env.VIPPS_TEST_MODE === 'true'

export const VIPPS_CONFIG = {
  /** OIDC Discovery */
  discoveryUrl: isTest
    ? 'https://apitest.vipps.no/access-management-1.0/access/.well-known/openid-configuration'
    : 'https://api.vipps.no/access-management-1.0/access/.well-known/openid-configuration',

  /** Dine Vipps API-nøkler (fra portal.vipps.no) */
  clientId: process.env.VIPPS_CLIENT_ID!,
  clientSecret: process.env.VIPPS_CLIENT_SECRET!,

  /** Scopes vi ber om – openid er påkrevd, resten gir brukerinfo */
  scopes: 'openid name email phoneNumber',

  /** Redirect tilbake til vår app */
  redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/auth/vipps/callback`,
}

/** Cache for discovery-dokumentet */
let discoveryCache: Record<string, string> | null = null
let discoveryCacheTime = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 time

export async function getDiscoveryDocument() {
  const now = Date.now()
  if (discoveryCache && now - discoveryCacheTime < CACHE_TTL) {
    return discoveryCache
  }

  const res = await fetch(VIPPS_CONFIG.discoveryUrl, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('Kunne ikke hente Vipps OIDC discovery-dokument')

  discoveryCache = await res.json()
  discoveryCacheTime = now
  return discoveryCache!
}
