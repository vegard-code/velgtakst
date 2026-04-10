/**
 * Vipps Webhooks API (v1)
 *
 * Denne modulen håndterer REGISTRERING av webhooks hos Vipps – ikke å
 * motta dem. For å motta webhook-kall må Vipps vite hvor de skal sendes,
 * og det gjør man ved å registrere en webhook via denne API-en.
 *
 * Når en webhook registreres returnerer Vipps en unik `secret` som skal
 * brukes til HMAC-verifisering av innkommende kall. Denne secret'en vises
 * KUN én gang – den må lagres i Vercel som miljøvariabel
 * (VIPPS_RECURRING_WEBHOOK_SECRET).
 *
 * Docs: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/api-guide/
 */

const isTest = process.env.VIPPS_TEST_MODE === 'true'
const BASE_URL = isTest ? 'https://apitest.vipps.no' : 'https://api.vipps.no'

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      client_id: process.env.VIPPS_CLIENT_ID!,
      client_secret: process.env.VIPPS_CLIENT_SECRET!,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
      'Merchant-Serial-Number':
        process.env.VIPPS_RECURRING_MSN ?? process.env.VIPPS_MSN!,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    const { requestId, trace } = collectVippsErrorHeaders(res)
    throw new VippsApiError(
      `accesstoken/get ${res.status}`,
      res.status,
      body,
      requestId,
      trace
    )
  }
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

/**
 * Returnerer hvilken MSN som faktisk brukes – nyttig for diagnose.
 */
export function debugVippsConfig() {
  return {
    baseUrl: BASE_URL,
    testMode: isTest,
    msnInUse: process.env.VIPPS_RECURRING_MSN ?? process.env.VIPPS_MSN ?? '(missing)',
    hasRecurringMsn: !!process.env.VIPPS_RECURRING_MSN,
    hasFallbackMsn: !!process.env.VIPPS_MSN,
    hasSubscriptionKey: !!process.env.VIPPS_SUBSCRIPTION_KEY,
    hasClientId: !!process.env.VIPPS_CLIENT_ID,
    hasClientSecret: !!process.env.VIPPS_CLIENT_SECRET,
  }
}

function vippsHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
    'Merchant-Serial-Number':
      process.env.VIPPS_RECURRING_MSN ?? process.env.VIPPS_MSN!,
    'Vipps-System-Name': 'Takstmann.net',
    'Vipps-System-Version': '1.0.0',
  }
}

export class VippsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
    public vippsRequestId: string | null,
    public vippsTrace: string | null
  ) {
    super(message)
    this.name = 'VippsApiError'
  }
}

function collectVippsErrorHeaders(res: Response): { requestId: string | null; trace: string | null } {
  return {
    requestId:
      res.headers.get('x-request-id') ??
      res.headers.get('request-id') ??
      res.headers.get('Vipps-Request-Id'),
    trace:
      res.headers.get('x-correlation-id') ??
      res.headers.get('ocp-apim-trace-location') ??
      null,
  }
}

export interface VippsRegistrertWebhook {
  id: string
  url: string
  events: string[]
}

export interface VippsRegistrertWebhookMedSecret extends VippsRegistrertWebhook {
  /** Returneres KUN ved første opprettelse – må lagres i env. */
  secret: string
}

/**
 * List alle registrerte webhooks for denne MSN.
 */
export async function listVippsWebhooks(): Promise<VippsRegistrertWebhook[]> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/webhooks/v1/webhooks`, {
    method: 'GET',
    headers: vippsHeaders(token),
  })
  if (!res.ok) {
    const body = await res.text()
    const { requestId, trace } = collectVippsErrorHeaders(res)
    throw new VippsApiError(
      `listWebhooks ${res.status}`,
      res.status,
      body,
      requestId,
      trace
    )
  }
  const data = (await res.json()) as { webhooks?: VippsRegistrertWebhook[] }
  return data.webhooks ?? []
}

/**
 * Registrer en ny webhook hos Vipps. Returnerer `secret` som må
 * kopieres inn i Vercel som VIPPS_RECURRING_WEBHOOK_SECRET.
 */
export async function opprettVippsWebhook(params: {
  url: string
  events: string[]
}): Promise<VippsRegistrertWebhookMedSecret> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/webhooks/v1/webhooks`, {
    method: 'POST',
    headers: vippsHeaders(token),
    body: JSON.stringify({
      url: params.url,
      events: params.events,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    const { requestId, trace } = collectVippsErrorHeaders(res)
    throw new VippsApiError(
      `createWebhook ${res.status}`,
      res.status,
      body,
      requestId,
      trace
    )
  }
  return (await res.json()) as VippsRegistrertWebhookMedSecret
}

/**
 * Slett en registrert webhook.
 */
export async function slettVippsWebhook(id: string): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/webhooks/v1/webhooks/${id}`, {
    method: 'DELETE',
    headers: vippsHeaders(token),
  })
  if (!res.ok && res.status !== 204) {
    const body = await res.text()
    const { requestId, trace } = collectVippsErrorHeaders(res)
    throw new VippsApiError(
      `deleteWebhook ${res.status}`,
      res.status,
      body,
      requestId,
      trace
    )
  }
}

/**
 * Standard-events vi lytter på for recurring-flyten.
 * Disse dekker hele livssyklusen for både agreements og charges.
 */
export const RECURRING_WEBHOOK_EVENTS = [
  'recurring.agreement-activated.v1',
  'recurring.agreement-rejected.v1',
  'recurring.agreement-stopped.v1',
  'recurring.agreement-expired.v1',
  'recurring.charge-reserved.v1',
  'recurring.charge-captured.v1',
  'recurring.charge-cancelled.v1',
  'recurring.charge-failed.v1',
  'recurring.charge-creation-failed.v1',
]
