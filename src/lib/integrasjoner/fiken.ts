// ============================================================
// Fiken API-klient
// Dokumentasjon: https://api.fiken.no/api/v2/docs/
// ============================================================

const FIKEN_BASE_URL = process.env.FIKEN_API_URL ?? 'https://api.fiken.no/api/v2'

export interface FikenKontakt {
  contactId?: number
  name: string
  email?: string
  phoneNumber?: string
  customerNumber?: number
}

export interface FikenFaktura {
  issueDate: string          // YYYY-MM-DD
  dueDate: string            // YYYY-MM-DD
  customerId: number
  lines: FikenFakturaLinje[]
  ourReference?: string
  yourReference?: string
  invoiceText?: string
}

export interface FikenFakturaLinje {
  net: number                // i ører (øre * 100)
  vat: number                // i ører
  vatType: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | 'RAW_FISH' | 'EXEMPT'
  description: string
  quantity?: number
  unitPrice?: number         // i ører
}

export class FikenKlient {
  private accessToken: string
  private companySlug: string

  constructor(accessToken: string, companySlug: string) {
    this.accessToken = accessToken
    this.companySlug = companySlug
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET',
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${FIKEN_BASE_URL}/companies/${this.companySlug}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const tekst = await response.text()
      throw new Error(`Fiken API feil ${response.status}: ${tekst}`)
    }

    if (response.status === 204) return {} as T
    return response.json()
  }

  async hentKontakter(): Promise<FikenKontakt[]> {
    return this.request<FikenKontakt[]>('/contacts?isCustomer=true')
  }

  async opprettKontakt(kontakt: FikenKontakt): Promise<FikenKontakt> {
    return this.request<FikenKontakt>('/contacts', 'POST', kontakt)
  }

  async hentEllerOpprettKontakt(epost: string, navn: string): Promise<FikenKontakt> {
    const kontakter = await this.hentKontakter()
    const eksisterende = kontakter.find(
      (k) => k.email?.toLowerCase() === epost.toLowerCase()
    )
    if (eksisterende) return eksisterende

    return this.opprettKontakt({
      name: navn,
      email: epost,
      customerNumber: Math.floor(Math.random() * 90000) + 10000,
    })
  }

  async opprettFaktura(faktura: FikenFaktura): Promise<{ invoiceId: number; invoiceNumber: number }> {
    return this.request('/sales-invoices', 'POST', faktura)
  }

  async sendFakturaEpost(fakturaId: number, epost: string): Promise<void> {
    await this.request(`/sales-invoices/${fakturaId}/send`, 'POST', {
      method: 'email',
      emailSendTo: epost,
      message: 'Faktura fra VelgTakst. Vennligst betal innen forfall.',
    })
  }

  async hentFakturaStatus(fakturaId: number): Promise<{ paid: boolean; amount: number }> {
    const data = await this.request<{ paid: boolean; net: number }>(`/sales-invoices/${fakturaId}`)
    return { paid: data.paid, amount: data.net }
  }
}
