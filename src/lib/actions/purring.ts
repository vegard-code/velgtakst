'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendPurringEpost, sendInkassoVarsel } from '@/lib/integrasjoner/epost'

export async function sendPurring(oppdragId: string, purreType: 'purring_1' | 'purring_2' | 'inkasso') {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: oppdrag, error: oppdragError } = await serviceClient
    .from('oppdrag')
    .select(`
      *,
      megler:megler_profiler(navn, epost),
      privatkunde:privatkunde_profiler(navn, epost)
    `)
    .eq('id', oppdragId)
    .maybeSingle()
  if (oppdragError) {
    console.error('[oppdrag] Feil ved henting av oppdrag i sendPurring:', oppdragError.message)
    return { error: 'Feil ved henting av oppdrag' }
  }

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
  await serviceClient.from('purre_logg').insert({
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
  // Cron-jobb har ingen autentisert bruker, må bruke serviceClient
  const serviceClient = await createServiceClient()
  const naa = new Date()

  // Hent alle fakturerte oppdrag (uten PostgREST joins)
  const { data: oppdragsListe } = await serviceClient
    .from('oppdrag')
    .select('id, tittel, pris, faktura_id, updated_at, company_id, megler_id, kunde_id')
    .eq('status', 'fakturert')

  if (!oppdragsListe?.length) return { behandlet: 0 }

  // Batch-hent alle company_settings og purre_logg i stedet for N+1
  const companyIds = [...new Set(oppdragsListe.map(o => o.company_id).filter(Boolean))]
  const oppdragIds = oppdragsListe.map(o => o.id)
  const meglerIds = [...new Set(oppdragsListe.map(o => o.megler_id).filter(Boolean))]
  const kundeIds = [...new Set(oppdragsListe.map(o => o.kunde_id).filter(Boolean))]

  // Parallelle batch-spørringer
  const [settingsRes, purringerRes, meglereRes, kunderRes] = await Promise.all([
    companyIds.length > 0
      ? serviceClient.from('company_settings')
          .select('company_id, purring_dager_1, purring_dager_2, inkasso_dager')
          .in('company_id', companyIds)
      : Promise.resolve({ data: [] as { company_id: string; purring_dager_1: number | null; purring_dager_2: number | null; inkasso_dager: number | null }[] }),
    serviceClient.from('purre_logg')
      .select('oppdrag_id, purre_type')
      .in('oppdrag_id', oppdragIds),
    meglerIds.length > 0
      ? serviceClient.from('megler_profiler').select('id, navn, epost').in('id', meglerIds)
      : Promise.resolve({ data: [] as { id: string; navn: string; epost: string | null }[] }),
    kundeIds.length > 0
      ? serviceClient.from('privatkunde_profiler').select('id, navn, epost').in('id', kundeIds)
      : Promise.resolve({ data: [] as { id: string; navn: string; epost: string | null }[] }),
  ])

  // Bygg oppslag-maps
  const settingsMap: Record<string, { purring_dager_1: number | null; purring_dager_2: number | null; inkasso_dager: number | null }> = {}
  for (const s of settingsRes.data ?? []) settingsMap[s.company_id] = s

  const purringerPerOppdrag: Record<string, string[]> = {}
  for (const p of purringerRes.data ?? []) {
    if (!purringerPerOppdrag[p.oppdrag_id]) purringerPerOppdrag[p.oppdrag_id] = []
    purringerPerOppdrag[p.oppdrag_id].push(p.purre_type)
  }

  const meglerMap: Record<string, { navn: string; epost: string | null }> = {}
  for (const m of meglereRes.data ?? []) meglerMap[m.id] = m

  const kundeMap: Record<string, { navn: string; epost: string | null }> = {}
  for (const k of kunderRes.data ?? []) kundeMap[k.id] = k

  let behandlet = 0

  for (const oppdrag of oppdragsListe) {
    if (!oppdrag.company_id) continue

    const settings = settingsMap[oppdrag.company_id]
    const dagerSidenstatus = Math.floor(
      (naa.getTime() - new Date(oppdrag.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    const purring1Dager = settings?.purring_dager_1 ?? 14
    const purring2Dager = settings?.purring_dager_2 ?? 28
    const inkassoDager = settings?.inkasso_dager ?? 60

    const purreTyper = purringerPerOppdrag[oppdrag.id] ?? []
    const harPurring1 = purreTyper.includes('purring_1')
    const harPurring2 = purreTyper.includes('purring_2')
    const harInkasso = purreTyper.includes('inkasso')

    const kunde = (oppdrag.megler_id ? meglerMap[oppdrag.megler_id] : null)
      ?? (oppdrag.kunde_id ? kundeMap[oppdrag.kunde_id] : null)
    if (!kunde?.epost) continue

    try {
      if (!harInkasso && dagerSidenstatus >= inkassoDager) {
        await sendInkassoVarsel({ til: kunde.epost, kundeNavn: kunde.navn, fakturaNummer: oppdrag.faktura_id ?? 'UKJENT', belopKroner: oppdrag.pris ?? 0 })
        await serviceClient.from('purre_logg').insert({ oppdrag_id: oppdrag.id, purre_type: 'inkasso', sendt_til: kunde.epost, status: 'sendt' })
        behandlet++
      } else if (!harPurring2 && dagerSidenstatus >= purring2Dager) {
        await sendPurringEpost({ til: kunde.epost, kundeNavn: kunde.navn, fakturaNummer: oppdrag.faktura_id ?? 'UKJENT', belopKroner: oppdrag.pris ?? 0, forfallsDato: '-', purreNummer: 2 })
        await serviceClient.from('purre_logg').insert({ oppdrag_id: oppdrag.id, purre_type: 'purring_2', sendt_til: kunde.epost, status: 'sendt' })
        behandlet++
      } else if (!harPurring1 && dagerSidenstatus >= purring1Dager) {
        await sendPurringEpost({ til: kunde.epost, kundeNavn: kunde.navn, fakturaNummer: oppdrag.faktura_id ?? 'UKJENT', belopKroner: oppdrag.pris ?? 0, forfallsDato: '-', purreNummer: 1 })
        await serviceClient.from('purre_logg').insert({ oppdrag_id: oppdrag.id, purre_type: 'purring_1', sendt_til: kunde.epost, status: 'sendt' })
        behandlet++
      }
    } catch (e) {
      console.error(`Purring feilet for oppdrag ${oppdrag.id}:`, e)
    }
  }

  return { behandlet }
}
