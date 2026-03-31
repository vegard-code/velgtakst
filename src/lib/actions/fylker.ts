'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function hentFylkeSynlighet(takstmannId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fylke_synlighet')
    .select('*')
    .eq('takstmann_id', takstmannId)
  return data ?? []
}

/**
 * Hent abonnement for innlogget bruker sin bedrift.
 * Oppretter automatisk et prøveperiode-abonnement hvis det ikke finnes.
 */
export async function hentEllerOpprettAbonnement(companyId: string) {
  const supabase = await createServiceClient()

  // Sjekk om abonnement allerede finnes
  const { data: existing } = await supabase
    .from('abonnementer')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (existing) return existing

  // Opprett prøveperiode-abonnement (90 dager gratis)
  const now = new Date()
  const slutt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const { data: nyttAbonnement } = await supabase
    .from('abonnementer')
    .insert({
      company_id: companyId,
      status: 'proveperiode',
      proveperiode_start: now.toISOString(),
      proveperiode_slutt: slutt.toISOString(),
      maanedlig_belop: 0,
    })
    .select('*')
    .single()

  return nyttAbonnement
}

export async function aktiverFylke(takstmannId: string, fylkeId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  // Hent takstmann sin company_id for å sjekke abonnement
  const { data: takstmann } = await supabase
    .from('takstmann_profiler')
    .select('company_id')
    .eq('id', takstmannId)
    .single()

  let betaltTil: Date

  if (takstmann?.company_id) {
    // Sjekk om bedriften har aktiv prøveperiode (service client for abonnementer)
    const { data: abonnement } = await serviceClient
      .from('abonnementer')
      .select('status, proveperiode_slutt')
      .eq('company_id', takstmann.company_id)
      .single()

    if (abonnement?.status === 'proveperiode') {
      betaltTil = new Date(abonnement.proveperiode_slutt)
    } else if (abonnement?.status === 'aktiv') {
      betaltTil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    } else {
      // Ingen abonnement eller utløpt — opprett prøveperiode
      const now = new Date()
      betaltTil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

      await serviceClient.from('abonnementer').upsert(
        {
          company_id: takstmann.company_id,
          status: 'proveperiode',
          proveperiode_start: now.toISOString(),
          proveperiode_slutt: betaltTil.toISOString(),
          maanedlig_belop: 0,
        },
        { onConflict: 'company_id' }
      )
    }
  } else {
    betaltTil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  }

  const { error } = await supabase
    .from('fylke_synlighet')
    .upsert(
      {
        takstmann_id: takstmannId,
        fylke_id: fylkeId,
        er_aktiv: true,
        betalt_til: betaltTil.toISOString(),
      },
      { onConflict: 'takstmann_id,fylke_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/portal/takstmann/fylker')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deaktiverFylke(takstmannId: string, fylkeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('fylke_synlighet')
    .update({ er_aktiv: false })
    .eq('takstmann_id', takstmannId)
    .eq('fylke_id', fylkeId)

  if (error) return { error: error.message }

  revalidatePath('/portal/takstmann/fylker')
  revalidatePath('/', 'layout')
  return { success: true }
}
