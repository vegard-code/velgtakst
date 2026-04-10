/**
 * Vipps webhook HMAC-verifisering
 *
 * Vipps signerer webhook-kall med HMAC-SHA256 via Azure API Management-format.
 * Docs: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/
 *
 * Inngående headers:
 *   - x-ms-date:             ISO-dato når Vipps signerte requesten
 *   - x-ms-content-sha256:   base64(sha256(rawBody))
 *   - authorization:         "HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<sig>"
 *   - host:                  vår host (takstmann.net eller www.takstmann.net)
 *
 * Signatur beregnes som:
 *   stringToSign = "POST\n<pathAndQuery>\n<x-ms-date>;<host>;<contentHash>"
 *   signature    = base64(hmac-sha256(webhookSecret, stringToSign))
 */
import crypto from 'node:crypto'

export interface VippsWebhookVerifyResult {
  ok: boolean
  /** Forklaring hvis verifisering feilet (kun for logging – IKKE send til klient) */
  reason?: string
}

interface VerifyParams {
  /** HTTP-metode, alltid "POST" for Vipps webhooks */
  method: string
  /** Path + querystring på webhook-endepunktet, f.eks. "/api/vipps/recurring-webhook" */
  pathAndQuery: string
  /** Host-header slik Vipps sendte den (f.eks. "www.takstmann.net") */
  host: string
  /** Rå request-body som string – IKKE parsed JSON */
  rawBody: string
  /** Alle headers fra requesten */
  headers: Headers
  /** Secret returnert ved webhook-registrering hos Vipps */
  secret: string
}

/**
 * Sjekk at HMAC-signaturen på en innkommende Vipps webhook er gyldig.
 * Fail-closed: returnerer `ok: false` ved enhver feil.
 *
 * Bruker `crypto.timingSafeEqual` for å unngå timing-angrep.
 */
export function verifyVippsWebhook(params: VerifyParams): VippsWebhookVerifyResult {
  const { method, pathAndQuery, host, rawBody, headers, secret } = params

  if (!secret) {
    return { ok: false, reason: 'missing-secret' }
  }

  const xMsDate = headers.get('x-ms-date')
  const xMsContentSha256 = headers.get('x-ms-content-sha256')
  const authHeader = headers.get('authorization')

  if (!xMsDate || !xMsContentSha256 || !authHeader) {
    return { ok: false, reason: 'missing-signature-headers' }
  }

  // 1) Verifiser at x-ms-content-sha256 matcher base64(sha256(rawBody))
  const computedContentHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('base64')
  if (!safeEqualB64(computedContentHash, xMsContentSha256)) {
    return { ok: false, reason: 'content-hash-mismatch' }
  }

  // 2) Trekk ut Signature fra Authorization-headeren
  // Format: "HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>"
  const match = authHeader.match(/Signature=([^,\s&]+)/i)
  if (!match) {
    return { ok: false, reason: 'signature-not-in-auth-header' }
  }
  const providedSignature = match[1]

  // 3) Bygg string-to-sign og beregn forventet signatur
  const stringToSign = `${method}\n${pathAndQuery}\n${xMsDate};${host};${xMsContentSha256}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(stringToSign, 'utf8')
    .digest('base64')

  if (!safeEqualB64(providedSignature, expectedSignature)) {
    return { ok: false, reason: 'signature-mismatch' }
  }

  return { ok: true }
}

/**
 * Timing-safe sammenligning av to base64-strenger.
 * Returnerer false hvis lengdene ikke matcher (uten å kaste).
 */
function safeEqualB64(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
  } catch {
    return false
  }
}
