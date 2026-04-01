'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getKommunerForFylke } from '@/data/kommuner'

/**
 * Hent kommune-synlighet for en takstmann i et gitt fylke
 */
export async function hentKommuneSynlighet(takstmannId: string, fylkeId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kommune_synlighet')
    .select('*')
    .eq('takstmann_id', takstmannId)
    .eq('fylke_id', fylkeId)
  return data ?? []
}

/**
 * Når et fylke aktiveres — opprett kommune_synlighet for alle kommuner i fylket
 * Alle settes til aktiv som standard
 */
export async function opprettKommunerForFylke(takstmannId: string, fylkeId: string) {
  const supabase = await createClient()
  const kommuner = getKommunerForFylke(fylkeId)

  if (kommuner.length === 0) return

  // Sjekk hvilke som allerede finnes
  const { data: eksisterende } = await supabase
    .from('kommune_synlighet')
    .select('kommune_id')
    .eq('takstmann_id', takstmannId)
    .eq('fylke_id', fylkeId)

  const eksisterendeIds = new Set((eksisterende ?? []).map(k => k.kommune_id))
  const nyeKommuner = kommuner.filter(k => !eksisterendeIds.has(k.id))

  if (nyeKommuner.length === 0) {
    // Alle finnes allerede — aktiver alle
    await supabase
      .from('kommune_synlighet')
      .update({ er_aktiv: true })
      .eq('takstmann_id', takstmannId)
      .eq('fylke_id', fylkeId)
    return
  }

  // Opprett nye + aktiver eksisterende
  const rows = nyeKommuner.map(k => ({
    takstmann_id: takstmannId,
    fylke_id: fylkeId,
    kommune_id: k.id,
    er_aktiv: true,
  }))

  await supabase.from('kommune_synlighet').insert(rows)

  // Aktiver eventuelle som var deaktivert
  if (eksisterendeIds.size > 0) {
    await supabase
      .from('kommune_synlighet')
      .update({ er_aktiv: true })
      .eq('takstmann_id', takstmannId)
      .eq('fylke_id', fylkeId)
  }
}

/**
 * Når et fylke deaktiveres — deaktiver alle kommuner i fylket
 */
export async function deaktiverKommunerForFylke(takstmannId: string, fylkeId: string) {
  const supabase = await createClient()
  await supabase
    .from('kommune_synlighet')
    .update({ er_aktiv: false })
    .eq('takstmann_id', takstmannId)
    .eq('fylke_id', fylkeId)
}

/**
 * Toggle en enkelt kommune av/på
 */
export async function toggleKommune(takstmannId: string, fylkeId: string, kommuneId: string, erAktiv: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('kommune_synlighet')
    .upsert(
      {
        takstmann_id: takstmannId,
        fylke_id: fylkeId,
        kommune_id: kommuneId,
        er_aktiv: erAktiv,
      },
      { onConflict: 'takstmann_id,kommune_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/portal/takstmann/fylker')
  revalidatePath(`/${fylkeId}/${kommuneId}`)
  return { success: true }
}
