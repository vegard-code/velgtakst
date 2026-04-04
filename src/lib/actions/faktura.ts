'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendFaktura } from '@/lib/integrasjoner/regnskap'

export async function sendFakturaForOppdrag(oppdragId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: profil } = await serviceClient
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profil?.company_id) return { error: 'Ingen bedrift funnet' }

  const { data: oppdrag } = await serviceClient
    .from('oppdrag')
    .select(`
      *,
      megler:megler_profiler(navn, epost),
      privatkunde:privatkunde_profiler(navn, epost)
    `)
    .eq('id', oppdragId)
    .single()

  if (!oppdrag) return { error: 'Oppdrag ikke funnet' }
  if (!oppdrag.pris) return { error: 'Oppdraget mangler pris' }

  const kunde = oppdrag.megler || oppdrag.privatkunde
  if (!kunde?.epost) return { error: 'Ingen kundeadresse funnet' }

  const resultat = await sendFaktura(profil.company_id, {
    oppdragId,
    tittel: oppdrag.tittel,
    beskrivelse: oppdrag.beskrivelse ?? undefined,
    pris: oppdrag.pris,
    kundeEpost: kunde.epost,
    kundeNavn: kunde.navn,
  })

  if (!resultat.success) return { error: resultat.error }

  // Lagre faktura-ID og oppdater status
  await serviceClient
    .from('oppdrag')
    .update({
      faktura_id: resultat.eksterntFakturaId,
      status: 'fakturert',
    })
    .eq('id', oppdragId)

  await serviceClient.from('status_logg').insert({
    oppdrag_id: oppdragId,
    fra_status: oppdrag.status,
    til_status: 'fakturert',
    endret_av: user.id,
    notat: `Faktura sendt (${resultat.fakturaNummerVisning ?? resultat.eksterntFakturaId})`,
  })

  revalidatePath(`/portal/takstmann/oppdrag/${oppdragId}`)
  return { success: true, fakturaNummerVisning: resultat.fakturaNummerVisning }
}

export async function synkroniserFakturaStatus(oppdragId: string) {
  const serviceClient = await createServiceClient()

  const { data: oppdrag } = await serviceClient
    .from('oppdrag')
    .select('faktura_id, company_id, status')
    .eq('id', oppdragId)
    .single()

  if (!oppdrag?.faktura_id || !oppdrag.company_id) return { oppdatert: false }

  const { data: settings } = await serviceClient
    .from('company_settings')
    .select('regnskap_system, fiken_api_token, fiken_company_id, tripletex_employee_token, tripletex_company_id')
    .eq('company_id', oppdrag.company_id)
    .single()

  if (!settings) return { oppdatert: false }

  let betalt = false

  try {
    if (settings.regnskap_system === 'fiken' && settings.fiken_api_token && settings.fiken_company_id) {
      const { FikenKlient } = await import('@/lib/integrasjoner/fiken')
      const klient = new FikenKlient(settings.fiken_api_token, settings.fiken_company_id)
      const status = await klient.hentFakturaStatus(Number(oppdrag.faktura_id))
      betalt = status.paid
    } else if (settings.regnskap_system === 'tripletex' && settings.tripletex_employee_token && settings.tripletex_company_id) {
      const { TripletexKlient } = await import('@/lib/integrasjoner/tripletex')
      const klient = new TripletexKlient(settings.tripletex_employee_token, settings.tripletex_company_id)
      const status = await klient.hentFakturaStatus(Number(oppdrag.faktura_id))
      betalt = status.betalt
    }
  } catch {
    return { oppdatert: false }
  }

  if (betalt && oppdrag.status === 'fakturert') {
    await serviceClient
      .from('oppdrag')
      .update({ status: 'betalt' })
      .eq('id', oppdragId)

    await serviceClient.from('status_logg').insert({
      oppdrag_id: oppdragId,
      fra_status: 'fakturert',
      til_status: 'betalt',
      endret_av: null,
      notat: 'Betaling registrert automatisk',
    })

    revalidatePath(`/portal/takstmann/oppdrag/${oppdragId}`)
    return { oppdatert: true }
  }

  return { oppdatert: false }
}
