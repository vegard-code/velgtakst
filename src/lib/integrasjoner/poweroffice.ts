// ============================================================
// PowerOffice GO API-klient
// OAuth2 client_credentials-flyt
// Dokumentasjon: https://api.poweroffice.net/Web/docs/index
// ============================================================

const POWEROFFICE_BASE = process.env.POWEROFFICE_API_URL ?? 'https://go.poweroffice.net/v2'
const POWEROFFICE_TOKEN_URL = 'https://go.poweroffice.net/OAuth/token'

export interface PowerOfficeKunde {
  id?: number
  name: string
  emailAddress?: string
  phoneNumber?: string
  code?: string
  isActive?: boolean
}

export interface PowerOfficeFakturaLinje {
  description: string
  quantity: number
  unitPrice: number
  productCode?: string
  vatCode?: string
}

export interface PowerOfficeFaktura {
  orderDate: string         // YYYY-MM-DD
  invoiceDueDate: string    // YYYY-MM-DD
  customerId: number
  lines: PowerOfficeFakturaLinje[]
  yourReference?: string
  ourReference?: string
  description?: string
}

export class PowerOfficeKlient {
  private clientKey: string
  private clientSecret: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(clientKey: string, clientSecret: string) {
    this.clientKey = clientKey
    this.clientSecret = clientSecret
  }

  private async hentAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.POWEROFFICE_APPLICATION_KEY ?? '',
      client_secret: this.clientKey,
    })

    const response = await fetch(POWEROFFICE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!response.ok) {
      const tekst = await response.text()
      throw new Error(`PowerOffice auth feil ${response.status}: ${tekst}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    // Trekk fra 60 sek som buffer
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
    return this.accessToken!
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET',
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

  async sokKunde(epost: string): Promise<PowerOfficeKunde | null> {
    const result = await this.request<{ data: PowerOfficeKunde[] }>(
      `/Customer?emailAddress=${encodeURIComponent(epost)}`
    )
    return result.data?.[0] ?? null
  }

  async opprettKunde(kunde: { name: string; email: string }): Promise<PowerOfficeKunde> {
    const result = await this.request<{ data: PowerOfficeKunde }>('/Customer', 'POST', {
      name: kunde.name,
      emailAddress: kunde.email,
      isActive: true,
    })
    return result.data
  }

  async hentEllerOpprettKunde(epost: string, navn: string): Promise<PowerOfficeKunde> {
    const eksisterende = await this.sokKunde(epost)
    if (eksisterende) return eksisterende
    return this.opprettKunde({ name: navn, email: epost })
  }

  async opprettFaktura(faktura: PowerOfficeFaktura): Promise<{ id: number; invoiceNo?: number }> {
    const result = await this.request<{ data: { id: number; invoiceNo?: number } }>(
      '/OutgoingInvoice',
      'POST',
      faktura
    )
    return result.data
  }

  async sendFakturaEpost(fakturaId: number, epost: string): Promise<void> {
    await this.request(`/OutgoingInvoice/${fakturaId}/SendByEmail`, 'POST', {
      emailAddress: epost,
    })
  }

  async hentFakturaStatus(fakturaId: number): Promise<{ betalt: boolean; belop: number }> {
    const result = await this.request<{
      data: { status: string; remainingAmount: number; totalAmount: number }
    }>(`/OutgoingInvoice/${fakturaId}`)
    return {
      betalt: result.data.status === 'Paid' || result.data.remainingAmount === 0,
      belop: result.data.totalAmount,
    }
  }
}
