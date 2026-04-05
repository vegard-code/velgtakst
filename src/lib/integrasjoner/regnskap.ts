// ============================================================
// Felles abstraksjonslag for regnskapssystemer
// ============================================================

import { FikenKlient } from './fiken'
import { TripletexKlient } from './tripletex'
import { PowerOfficeKlient } from './poweroffice'
import { createClient } from '@/lib/supabase/server'

export interface FakturaInput {
  oppdragId: string
  tittel: string
  beskrivelse?: string
  pris: number               // i kroner
  kundeEpost: string
  kundeNavn: string
  betalingsfristDager?: number
}

export interface FakturaResultat {
  eksterntFakturaId: string
  fakturaNummerVisning?: string
  success: boolean
  error?: string
}

export async function hentRegnskapsklient(companyId: string) {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (!settings?.regnskap_system || settings.regnskap_system === 'ingen') {
    return { klient: null, system: 'ingen' as const }
  }

  if (settings.regnskap_system === 'fiken') {
    if (!settings.fiken_api_token || !settings.fiken_company_id) {
      return { klient: null, system: 'fiken' as const, feil: 'Fiken ikke konfigurert' }
    }
    return {
      klient: new FikenKlient(settings.fiken_api_token, settings.fiken_company_id),
      system: 'fiken' as const,
    }
  }

  if (settings.regnskap_system === 'tripletex') {
    if (!settings.tripletex_employee_token || !settings.tripletex_company_id) {
      return { klient: null, system: 'tripletex' as const, feil: 'Tripletex ikke konfigurert' }
    }
    return {
      klient: new TripletexKlient(
        settings.tripletex_employee_token,
        settings.tripletex_company_id
      ),
      system: 'tripletex' as const,
    }
  }

  if (settings.regnskap_system === 'poweroffice') {
    if (!settings.poweroffice_client_key) {
      return { klient: null, system: 'poweroffice' as const, feil: 'PowerOffice GO ikke konfigurert' }
    }
    return {
      klient: new PowerOfficeKlient(settings.poweroffice_client_key),
      system: 'poweroffice' as const,
    }
  }

  return { klient: null, system: 'ingen' as const }
}

export async function sendFaktura(
  companyId: string,
  input: FakturaInput
): Promise<FakturaResultat> {
  const { klient, system, feil } = await hentRegnskapsklient(companyId)

  if (feil) return { eksterntFakturaId: '', success: false, error: feil }
  if (!klient) {
    return { eksterntFakturaId: '', success: false, error: 'Ingen regnskapssystem konfigurert' }
  }

  const forfallsDato = new Date()
  forfallsDato.setDate(forfallsDato.getDate() + (input.betalingsfristDager ?? 14))
  const iDag = new Date().toISOString().split('T')[0]
  const forfall = forfallsDato.toISOString().split('T')[0]

  try {
    if (system === 'fiken') {
      const fikenKlient = klient as FikenKlient

      // Hent eller opprett kontakt
      const kontakt = await fikenKlient.hentEllerOpprettKontakt(
        input.kundeEpost,
        input.kundeNavn
      )

      const faktura = await fikenKlient.opprettFaktura({
        issueDate: iDag,
        dueDate: forfall,
        customerId: kontakt.contactId!,
        lines: [
          {
            description: input.tittel + (input.beskrivelse ? ` – ${input.beskrivelse}` : ''),
            net: input.pris * 100,    // Fiken bruker øre
            vat: input.pris * 25,     // 25% MVA i øre
            vatType: 'HIGH',
            quantity: 1,
          },
        ],
        ourReference: input.oppdragId,
      })

      await fikenKlient.sendFakturaEpost(faktura.invoiceId, input.kundeEpost)

      return {
        eksterntFakturaId: String(faktura.invoiceId),
        fakturaNummerVisning: String(faktura.invoiceNumber),
        success: true,
      }
    }

    if (system === 'tripletex') {
      const ttxKlient = klient as TripletexKlient

      const kunder = await ttxKlient.sokKunde(input.kundeNavn)
      let kunde = kunder.find((k) => true) // ta første

      if (!kunde) {
        kunde = await ttxKlient.opprettKunde({
          name: input.kundeNavn,
          email: input.kundeEpost,
          isCustomer: true,
        })
      }

      const faktura = await ttxKlient.opprettFaktura({
        invoiceDate: iDag,
        invoiceDueDate: forfall,
        customer: { id: kunde.id! },
        invoiceLines: [
          {
            description: input.tittel,
            count: 1,
            unitPriceExcludingVatCurrency: input.pris,
          },
        ],
      })

      await ttxKlient.sendFakturaEpost(faktura.id)

      return {
        eksterntFakturaId: String(faktura.id),
        fakturaNummerVisning: String(faktura.invoiceNumber),
        success: true,
      }
    }

    if (system === 'poweroffice') {
      const poKlient = klient as PowerOfficeKlient

      const kunde = await poKlient.hentEllerOpprettKunde(input.kundeEpost, input.kundeNavn)

      const faktura = await poKlient.opprettFaktura({
        customerId: kunde.id!,
        invoiceDate: iDag,
        dueDate: forfall,
        ourReference: input.oppdragId,
        outgoingInvoiceLines: [
          {
            description: input.tittel + (input.beskrivelse ? ` – ${input.beskrivelse}` : ''),
            quantity: 1,
            unitPrice: input.pris,
            vatCode: '3',  // 25% MVA (høy sats)
          },
        ],
      })

      await poKlient.sendFakturaEpost(faktura.id)

      return {
        eksterntFakturaId: String(faktura.id),
        fakturaNummerVisning: String(faktura.invoiceNo),
        success: true,
      }
    }

    return { eksterntFakturaId: '', success: false, error: 'Ukjent regnskapssystem' }
  } catch (err) {
    const melding = err instanceof Error ? err.message : 'Ukjent feil'
    return { eksterntFakturaId: '', success: false, error: melding }
  }
}
