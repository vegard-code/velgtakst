/**
 * Vipps ePayment API – betaling for takstoppdrag
 *
 * Flyten:
 * 1. Takstmann sender faktura → vi oppretter en Vipps-betaling
 * 2. Kunde får push-varsel i Vipps-appen
 * 3. Kunde godkjenner → status = AUTHORIZED
 * 4. Vi capturer betalingen (automatisk eller manuelt)
 * 5. Pengene overføres
 */

const isTest = process.env.VIPPS_TEST_MODE === 'true'

const BASE_URL = isTest
  ? 'https://apitest.vipps.no'
  : 'https://api.vipps.no'

interface VippsPaymentRequest {
  /** Unikt referanse-nummer (f.eks. oppdrag-ID) */
  reference: string
  /** Beløp i øre (NOK × 100) */
  amountInOre: number
  /** Beskrivelse som vises i Vipps */
  description: string
  /** Kundens telefonnummer (norsk, uten landskode) */
  customerPhone?: string
  /** URL kunden sendes til etter betaling */
  returnUrl: string
  /** Webhook-URL for statusoppdateringer */
  callbackUrl: string
}

interface VippsTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

/** Cache for access token */
let tokenCache: { token: string; expiresAt: number } | null = null

/**
 * Hent access token fra Vipps (client credentials)
 */
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
    throw new Error(`Vipps token error: ${err}`)
  }

  const data: VippsTokenResponse = await res.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000, // 60s buffer
  }

  return data.access_token
}

/**
 * Opprett en Vipps-betaling for et oppdrag
 */
export async function opprettVippsBetaling(req: VippsPaymentRequest) {
  const accessToken = await getAccessToken()

  const body = {
    amount: {
      currency: 'NOK',
      value: req.amountInOre,
    },
    paymentMethod: {
      type: 'WALLET',
    },
    customer: req.customerPhone
      ? { phoneNumber: `47${req.customerPhone.replace(/\s/g, '')}` }
      : undefined,
    reference: req.reference,
    paymentDescription: req.description,
    returnUrl: req.returnUrl,
    userFlow: 'PUSH_MESSAGE',
    receipt: {
      orderLines: [
        {
          name: req.description,
          totalAmount: req.amountInOre,
          totalAmountExcludingTax: Math.round(req.amountInOre * 0.75), // 25% MVA
          totalTaxAmount: Math.round(req.amountInOre * 0.25),
          taxPercentage: 25,
        },
      ],
      bottomLine: {
        currency: 'NOK',
        tipAmount: 0,
      },
    },
  }

  const res = await fetch(`${BASE_URL}/epayment/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
      'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      'Idempotency-Key': req.reference,
      'Vipps-System-Name': 'VelgTakst',
      'Vipps-System-Version': '1.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Vipps create payment error:', err)
    throw new Error(`Kunne ikke opprette Vipps-betaling: ${err}`)
  }

  return await res.json()
}

/**
 * Capture en godkjent betaling
 */
export async function captureVippsBetaling(reference: string, amountInOre: number) {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/epayment/v1/payments/${reference}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
      'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      'Idempotency-Key': `capture-${reference}`,
    },
    body: JSON.stringify({
      modificationAmount: {
        currency: 'NOK',
        value: amountInOre,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Vipps capture error:', err)
    throw new Error(`Kunne ikke capture Vipps-betaling: ${err}`)
  }

  return await res.json()
}

/**
 * Sjekk status på en betaling
 */
export async function hentVippsBetalingStatus(reference: string) {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/epayment/v1/payments/${reference}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
      'Merchant-Serial-Number': process.env.VIPPS_MSN!,
    },
  })

  if (!res.ok) {
    throw new Error('Kunne ikke hente betalingsstatus')
  }

  return await res.json()
}

/**
 * Kanseller en betaling som ikke er captured ennå
 */
export async function kansellerVippsBetaling(reference: string) {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/epayment/v1/payments/${reference}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
      'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      'Idempotency-Key': `cancel-${reference}`,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Kunne ikke kansellere betaling: ${err}`)
  }

  return await res.json()
}

/**
 * Refunder en captured betaling
 */
export async function refunderVippsBetaling(reference: string, amountInOre: number) {
  const accessToken = await getAccessToken()

  const res = await fetch(`${BASE_URL}/epayment/v1/payments/${reference}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY!,
      'Merchant-Serial-Number': process.env.VIPPS_MSN!,
      'Idempotency-Key': `refund-${reference}-${Date.now()}`,
    },
    body: JSON.stringify({
      modificationAmount: {
        currency: 'NOK',
        value: amountInOre,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Kunne ikke refundere betaling: ${err}`)
  }

  return await res.json()
}
