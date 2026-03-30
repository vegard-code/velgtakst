import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes, createHash } from 'crypto'
import { VIPPS_CONFIG, getDiscoveryDocument } from '@/lib/vipps/config'

/**
 * GET /api/auth/vipps
 *
 * Starter Vipps Login-flyten:
 * 1. Genererer state + PKCE code_verifier/code_challenge
 * 2. Lagrer i httpOnly-cookie
 * 3. Redirecter til Vipps sin autorisasjonsside
 *
 * Query-parametere:
 *   ?rolle=takstmann|megler|privatkunde  – hvilken rolle brukeren skal få
 *   ?redirect=/portal/takstmann          – hvor brukeren sendes etter innlogging
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rolle = searchParams.get('rolle') ?? ''
  const redirect = searchParams.get('redirect') ?? '/portal'

  // Hent OIDC-endepunkter fra Vipps
  const discovery = await getDiscoveryDocument()
  const authorizationEndpoint = discovery.authorization_endpoint

  // Generer state (CSRF-beskyttelse)
  const state = randomBytes(32).toString('hex')

  // PKCE – code_verifier og code_challenge
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  // Lagre state, code_verifier, rolle og redirect i cookie
  const cookieStore = await cookies()
  cookieStore.set('vipps_auth', JSON.stringify({
    state,
    codeVerifier,
    rolle,
    redirect,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutter
    path: '/',
  })

  // Bygg autorisasjons-URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: VIPPS_CONFIG.clientId,
    redirect_uri: VIPPS_CONFIG.redirectUri,
    scope: VIPPS_CONFIG.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return NextResponse.redirect(`${authorizationEndpoint}?${params.toString()}`)
}
