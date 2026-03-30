// ============================================================
// Tripletex API-klient
// Bruker session-token autentisering
// Dokumentasjon: https://tripletex.no/v2-docs/
// ============================================================

const TRIPLETEX_BASE = process.env.TRIPLETEX_API_URL ?? 'https://tripletex.no/v2'
const CONSUMER_TOKEN = process.env.TRIPLETEX_CONSUMER_TOKEN ?? ''

export interface TripletexKunde {
  id?: number
  name: string
  email?: string
  phoneNumber?: string
  customerNumber?: number
  isCustomer: true
}

export interface TripletexFaktura {
  invoiceDate: string        // YYYY-MM-DD
  invoiceDueDate: string     // YYYY-MM-DD
  customer: { id: number }
  orders?: { id: number }[]
  invoiceLines?: TripletexFakturaLinje[]
}

export interface TripletexFakturaLinje {
  description: string
  count: number
  unitPriceExcludingVatCurrency: number
  vatType?: { id: number }
}

export class TripletexKlient {
  private sessionToken: string | null = null
  private employeeToken: string
  private companyId: string

  constructor(employeeToken: string, companyId: string) {
    this.employeeToken = employeeToken
    this.companyId = companyId
  }

  private async hentSessionToken(): Promise<string> {
    if (this.sessionToken) return this.sessionToken

    // Session token utløper etter 24 timer – forny daglig via cron
    const utloper = new Date()
    utloper.setHours(utloper.getHours() + 24)

    const url = new URL(`${TRIPLETEX_BASE}/token/session/:create`)
    url.searchParams.set('consumerToken', CONSUMER_TOKEN)
    url.searchParams.set('employeeToken', this.employeeToken)
    url.searchParams.set('expirationDate', utloper.toISOString().split('T')[0])

    const response = await fetch(url.toString(), { method: 'PUT' })
    if (!response.ok) throw new Error('Kunne ikke hente Tripletex session token')

    const data = await response.json()
    this.sessionToken = data.value?.token
    return this.sessionToken!
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    body?: unknown
  ): Promise<T> {
    const token = await this.hentSessionToken()
    const credentials = Buffer.from(`0:${token}`).toString('base64')

    const response = await fetch(`${TRIPLETEX_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const tekst = await response.text()
      throw new Error(`Tripletex API feil ${response.status}: ${tekst}`)
    }

    if (response.status === 204) return {} as T
    return response.json()
  }

  async opprettKunde(kunde: TripletexKunde): Promise<TripletexKunde> {
    const result = await this.request<{ value: TripletexKunde }>('/customer', 'POST', kunde)
    return result.value
  }

  async sokKunde(navn: string): Promise<TripletexKunde[]> {
    const result = await this.request<{ values: TripletexKunde[] }>(
      `/customer?name=${encodeURIComponent(navn)}&isCustomer=true`
    )
    return result.values ?? []
  }

  async opprettFaktura(faktura: TripletexFaktura): Promise<{ id: number; invoiceNumber: number }> {
    const result = await this.request<{ value: { id: number; invoiceNumber: number } }>(
      '/invoice',
      'POST',
      faktura
    )
    return result.value
  }

  async sendFakturaEpost(fakturaId: number): Promise<void> {
    await this.request(`/invoice/${fakturaId}/:send`, 'PUT', {
      sendType: 'EMAIL',
    })
  }

  async hentFakturaStatus(fakturaId: number): Promise<{ betalt: boolean }> {
    const result = await this.request<{ value: { amount: number; amountRemaining: number } }>(
      `/invoice/${fakturaId}`
    )
    return { betalt: result.value.amountRemaining === 0 }
  }
}
