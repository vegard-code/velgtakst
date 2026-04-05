// ============================================================
// PowerOffice GO API-klient
// Bruker OAuth2 client_credentials
// Dokumentasjon: https://api.poweroffice.net/Web/docs/index
// ============================================================

const POWEROFFICE_BASE = process.env.POWEROFFICE_API_URL ?? 'https://api.poweroffice.net'
const APPLICATION_KEY = process.env.POWEROFFICE_APPLICATION_KEY ?? ''

export interface PowerOfficeKunde {
  id?: number
  name: string
  emailAddress?: string
  invoiceEmailAddress?: string
  phoneNumber?: string
  customerCode?: string
}

export interface PowerOfficeFaktura {
  customerId: number
  invoiceDate: string        // YYYY-MM-DD
  dueDate: string            // YYYY-MM-DD
  yourReference?: string
  ourReference?: string
  outgoingInvoiceLines: PowerOfficeFakturaLinje[]
}

export interface PowerOfficeFakturaLinje {
  description: string
  quantity: number
  unitPrice: number          // eks. MVA
  vatCode?: string           // '3' = høy sats (25%)
  productCode?: string
}

export class PowerOfficeKlient {
  private clientKey: string
  private accessToken: string | null = null
  private tokenUtloper: Date | null = null

  constructor(clientKey: string) {
    this.clientKey = clientKey
  }

  private async hentAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenUtloper && this.tokenUtloper > new Date()) {
      return this.accessToken
    }

    const response = await fetch(`${POWEROFFICE_BASE}/OAuth/Token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: APPLICATION_KEY,
        client_secret: this.clientKey,
      }),
    })

    if (!response.ok) {
      const tekst = await response.text()
      throw new Error(`PowerOffice OAuth feil ${response.status}: ${tekst}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    // expires_in er i sekunder; trekk fra 60s som buffer
    const ekspiresI = (data.expires_in ?? 3600) - 60
    this.tokenUtloper = new Date(Date.now() + ekspiresI * 1000)
    return this.accessToken!
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    const token = await this.hentAccessToken()

    const response = await fetch(`${POWEROFFICE_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const tekst = await response.text()
      throw new Error(`PowerOffice API feil ${response.status}: ${tekst}`)
    }

    if (response.status === 204) return {} as T
    return response.json()
  }

  async sokKunde(epost: string): Promise<PowerOfficeKunde[]> {
    const result = await this.request<{ data: PowerOfficeKunde[] }>(
      `/v2/Customer?emailAddress=${encodeURIComponent(epost)}`
    )
    return result.data ?? []
  }

  async opprettKunde(kunde: PowerOfficeKunde): Promise<PowerOfficeKunde> {
    const result = await this.request<{ data: PowerOfficeKunde }>('/v2/Customer', 'POST', kunde)
    return result.data
  }

  async hentEllerOpprettKunde(epost: string, navn: string): Promise<PowerOfficeKunde> {
    const kunder = await this.sokKunde(epost)
    if (kunder.length > 0) return kunder[0]

    return this.opprettKunde({
      name: navn,
      emailAddress: epost,
      invoiceEmailAddress: epost,
    })
  }

  async opprettFaktura(faktura: PowerOfficeFaktura): Promise<{ id: number; invoiceNo: number }> {
    const result = await this.request<{ data: { id: number; invoiceNo: number } }>(
      '/v2/OutgoingInvoice',
      'POST',
      faktura
    )
    return result.data
  }

  async sendFakturaEpost(fakturaId: number): Promise<void> {
    await this.request(`/v2/OutgoingInvoice/${fakturaId}/Send`, 'POST', {
      sendMethod: 'Email',
    })
  }

  async hentFakturaStatus(fakturaId: number): Promise<{ betalt: boolean; belop: number }> {
    const result = await this.request<{
      data: { status: string; remainingAmount: number; totalAmount: number }
    }>(`/v2/OutgoingInvoice/${fakturaId}`)
    return {
      betalt: result.data.remainingAmount === 0,
      belop: result.data.totalAmount,
    }
  }
}
