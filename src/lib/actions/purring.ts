'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendPurringEpost, sendInkassoVarsel } from '@/lib/integrasjoner/epost'

export async function sendPurring(oppdragId: string, purreType: 'purring_1' | 'purring_2' | 'inkasso') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: oppdrag } = await supabase
    .from('oppdrag')
    .select(`
      *,
      megler:megler_profiler(navn, epost),
      privatkunde:privatkunde_profiler(navn, epost)
    `)
    .eq('id', oppdragId)
    .single()

  if (!oppdrag) return { error: 'Oppdrag ikke funnet' }

  const kunde = oppdrag.megler || oppdrag.privatkunde
  if (!kunde?.epost) return { error: 'Ingen kundeepost funnet' }

  const fakturaNummer = oppdrag.faktura_id ?? 'UKJENT'
  const belopKroner = oppdrag.pris ?? 0
  const forfallsDato = 'Se faktura'

  try {
    if (purreType === 'purring_1' || purreType === 'purring_2') {
      await sendPurringEpost({
        til: kunde.epost,
        kundeNavn: kunde.navn,
        fakturaNummer,
        belopKroner,
        forfallsDato,
        purreNummer: purreType === 'purring_1' ? 1 : 2,
      })
    } else if (purreType === 'inkasso') {
      await sendInkassoVarsel({
        til: kunde.epost,
        kundeNavn: kunde.navn,
        fakturaNummer,
        belopKroner,
      })
    }
  } catch (err) {
    const melding = err instanceof Error ? err.message : 'Ukjent feil'
    return { error: `Sending feilet: ${melding}` }
  }

  // Logg purringen
  await supabase.from('purre_logg').insert({
    oppdrag_id: oppdragId,
    purre_type: purreType,
    sendt_til: kunde.epost,
    sendt_av: user.id,
    status: 'sendt',
  })

  revalidatePath(`/portal/takstmann/oppdrag/${oppdragId}`)
  return { success: true }
}

// Kjøres av cron – sjekker alle fakturerte oppdrag
export async function kjorAutomatiskPurring() {
  const supabase = await createClient()
  const naa = new Date()

  // Hent alle fakturerte oppdrag med bedriftssettings
  const { data: oppdragsListe } = await supabase
    .from('oppdrag')
    .select(`
      id, tittel, pris, faktura_id, updated_at, company_id,
      megler:megler_profiler(navn, epost),
      privatkunde:privatkunde_profiler(navn, epost)
    `)
    .eq('status', 'fakturert')

  if (!oppdragsListe?.length) return { behandlet: 0 }

  let behandlet = 0

  for (const oppdrag of oppdragsListe) {
    if (!oppdrag.company_id) continue

    const { data: settings } = await supabase
      .from('company_settings')
      .select('purring_dager_1, purring_dager_2, inkasso_dager')
      .eq('company_id', oppdrag.company_id)
      .single()

    const dagerSidenstatus = Math.floor(
      (naa.getTime() - new Date(oppdrag.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const purring1Dager = settings?.purring_dager_1 ?? 14
    const purring2Dager = settings?.purring_dager_2 ?? 28
    const inkassoDager = settings?.inkasso_dager ?? 60

    // Hent eksisterende purringer
    const { data: purringer } = await supabase
      .from('purre_logg')
      .select('purre_type')
      .eq('oppdrag_id', oppdrag.id)

    const harPurring1 = purringer?.some((p) => p.purre_type === 'purring_1')
    const harPurring2 = purringer?.some((p) => p.purre_type === 'purring_2')
    const harInkasso = purringer?.some((p) => p.purre_type === 'inkasso')

    const kunde = (oppdrag.megler as unknown as { navn: string; epost: string | null } | null)
      || (oppdrag.privatkunde as unknown as { navn: string; epost: string | null } | null)
    if (!kunde?.epost) continue

    try {
      if (!harInkasso && dagerSidenstatus >= inkassoDager) {
        await sendInkassoVarsel({ til: kunde.epost, kundeNavn: kunde.navn, fakturaNummer: oppdrag.faktura_id ?? 'UKJENT', belopKroner: oppdrag.pris ?? 0 })
        await supabase.from('purre_logg').insert({ oppdrag_id: oppdrag.id, purre_type: 'inkasso', sendt_til: kunde.epost, status: 'sendt' })
        behandlet++
      } else if (!harPurring2 && dagerSidenstatus >= purring2Dager) {
        await sendPurringEpost({ til: kunde.epost, kundeNavn: kunde.navn, fakturaNummer: oppdrag.faktura_id ?? 'UKJENT', belopKroner: oppdrag.pris ?? 0, forfallsDato: '-', purreNummer: 2 })
        await supabase.from('purre_logg').insert({ oppdrag_id: oppdrag.id, purre_type: 'purring_2', sendt_til: kunde.epost, status: 'sendt' })
        behandlet++
      } else if (!harPurring1 && dagerSidenstatus >= purring1Dager) {
        await sendPurringEpost({ til: kunde.epost, kundeNavn: kunde.navn, fakturaNummer: oppdrag.faktura_id ?? 'UKJENT', belopKroner: oppdrag.pris ?? 0, forfallsDato: '-', purreNummer: 1 })
        await supabase.from('purre_logg').insert({ oppdrag_id: oppdrag.id, purre_type: 'purring_1', sendt_til: kunde.epost, status: 'sendt' })
        behandlet++
      }
    } catch (e) {
      console.error(`Purring feilet for oppdrag ${oppdrag.id}:`, e)
    }
  }

  return { behandlet }
}
