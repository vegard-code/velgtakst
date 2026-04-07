/**
 * Vipps Recurring API – abonnementer for takstmenn
 *
 * Flyten:
 * 1. Takstmann starter prøveperiode (30 dager gratis)
 * 2. Mot slutten av prøveperioden oppretter vi en Vipps Recurring agreement
 * 3. Takstmann godkjenner i Vipps-appen
 * 4. Vi oppretter monthly charges basert på aktive fylker
 * 5. Charges trekkes automatisk
 *
 * Vipps Recurring API v3:
 * - POST /recurring/v3/agreements          → opprett agreement
 * - GET  /recurring/v3/agreements/{id}      → hent agreement
 * - PATCH /recurring/v3/agreements/{id}     → oppdater agreement
 * - POST /recurring/v3/agreements/{id}/charges → opprett charge
 * - GET  /recurring/v3/agreements/{id}/charges → list charges
 */

const isTest = process.env.VIPPS_TEST_MODE === 'true'

const BASE_URL = isTest
  ? 'https://apitest.vipps.no'
  : 'https://api.vipps.no'

interface VippsTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/** Cache for access token */
let tokenCache: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (tokenCache && now < tokenCache.expiresAt) {
    return tokenCache.token
  }

  const res = await fetch(`${BASE_URL}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'client_id': process.env.VIPPS_CLIENT_ID!,
      'client_secret': process.env.VIPPS_CLIENT_SECRET!,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
      'Merchant-Serial-Number': process.env.VIPPS_MSN!,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Vipps token error status:', res.status, 'body:', err)
    throw new Error(`Vipps token error ${res.status}: ${err}`)
  }

  const data: VippsTokenResponse = await res.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  }

  return data.access_token
}

function vippsHeaders(accessToken: string, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
    'Merchant-Serial-Number': process.env.VIPPS_MSN!,
    'Vipps-System-Name': 'VelgTakst',
    'Vipps-System-Version': '1.0.0',
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey
  }
  return headers
}

// ============================================================
// Agreement (abonnementsavtale)
// ============================================================

export interface OpprettAgreementParams {
  /** Kundens telefonnr (norsk, uten landskode) */
  customerPhone?: string
  /** Månedlig beløp i øre */
  monthlyAmountOre: number
  /** Beskrivelse som vises i Vipps */
  productName: string
  /** Intern referanse */
  reference: string
  /** URL kunden sendes til etter godkjenning */
  returnUrl: string
  /** Webhook for status-oppdateringer */
  notificationUrl: string
}

export interface VippsAgreement {
  agreementId: string
  status: 'PENDING' | 'ACTIVE' | 'STOPPED' | 'EXPIRED'
  start?: string
  stop?: string
}

/**
 * Opprett en Vipps Recurring agreement.
 * Kunden får en push i Vipps-appen for å godkjenne.
 */
export async function opprettAgreement(params: OpprettAgreementParams): Promise<{
  agreementId: string
  vippsConfirmationUrl: string
}> {
  const accessToken = await getAccessToken()

  // Vipps Recurring v3 agreement body
  const body: Record<string, unknown> = {
    pricing: {
      type: 'LEGACY',
      amount: params.monthlyAmountOre,
      currency: 'NOK',
    },
    interval: {
      unit: 'MONTH',
      count: 1,
    },
    merchantRedirectUrl: params.returnUrl,
    merchantAgreementUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/takstmann/abonnement`,
    productName: params.productName,
    notificationUrl: params.notificationUrl,
  }

  // phoneNumber must be MSISDN format (e.g. "4712345678")
  if (params.customerPhone) {
    const cleaned = params.customerPhone.replace(/\s/g, '').replace(/^\+47/, '').replace(/^47/, '')
    if (cleaned.length === 8) {
      body.phoneNumber = `47${cleaned}`
    }
  }

  const res = await fetch(`${BASE_URL}/recurring/v3/agreements`, {
    method: 'POST',
    headers: vippsHeaders(accessToken, crypto.randomUUID()),
    body: JSON.stringify(body),
  })

  const responseText = await res.text()

  if (!res.ok) {
    throw new Error(`Vipps API ${res.status}: ${responseText}`)
  }

  const data = JSON.parse(responseText)
  return {
    agreementId: data.agreementId,
    vippsConfirmationUrl: data.vippsConfirmationUrl,
  }
}

/**
 * Hent status på en agreement
 */
export async function hentAgreement(agreementId: string): Promise<VippsAgreement> {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/recurring/v3/agreements/${agreementId}`, {
    headers: vippsHeaders(accessToken),
  })

  if (!res.ok) {
    throw new Error('Kunne ikke hente Vipps-avtale')
  }

  return await res.json()
}

/**
 * Stopp en agreement (si opp abonnement)
 */
export async function stoppAgreement(agreementId: string): Promise<void> {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/recurring/v3/agreements/${agreementId}`, {
    method: 'PATCH',
    headers: vippsHeaders(accessToken),
    body: JSON.stringify({ status: 'STOPPED' }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Kunne ikke stoppe Vipps-avtale: ${err}`)
  }
}

/**
 * Oppdater beløpet på en agreement (f.eks. når takstmann aktiverer/deaktiverer fylker)
 */
export async function oppdaterAgreementBelop(agreementId: string, nyMaanedligOre: number): Promise<void> {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/recurring/v3/agreements/${agreementId}`, {
    method: 'PATCH',
    headers: vippsHeaders(accessToken),
    body: JSON.stringify({
      pricing: {
        amount: nyMaanedligOre,
        currency: 'NOK',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Kunne ikke oppdatere beløp: ${err}`)
  }
}

// ============================================================
// Charges (månedlige trekk)
// ============================================================

export interface OpprettChargeParams {
  agreementId: string
  /** Beløp i øre */
  amountOre: number
  description: string
  /** Dato charge skal trekkes (YYYY-MM-DD) */
  dueDate: string
}

/**
 * Opprett en charge (månedlig trekk) på en agreement
 */
export async function opprettCharge(params: OpprettChargeParams): Promise<{ chargeId: string }> {
  const accessToken = await getAccessToken()

  const body = {
    amount: params.amountOre,
    currency: 'NOK',
    description: params.description,
    due: params.dueDate,
    retryDays: 5,
  }

  const res = await fetch(`${BASE_URL}/recurring/v3/agreements/${params.agreementId}/charges`, {
    method: 'POST',
    headers: vippsHeaders(accessToken, `charge-${params.agreementId}-${params.dueDate}`),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Vipps create charge error:', err)
    throw new Error(`Kunne ikke opprette charge: ${err}`)
  }

  return await res.json()
}

/**
 * List charges for en agreement
 */
export async function hentCharges(agreementId: string) {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/recurring/v3/agreements/${agreementId}/charges`, {
    headers: vippsHeaders(accessToken),
  })

  if (!res.ok) {
    throw new Error('Kunne ikke hente charges')
  }

  return await res.json()
}
