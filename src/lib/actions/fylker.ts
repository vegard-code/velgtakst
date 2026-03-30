'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function hentFylkeSynlighet(takstmannId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fylke_synlighet')
    .select('*')
    .eq('takstmann_id', takstmannId)
  return data ?? []
}

export async function aktiverFylke(takstmannId: string, fylkeId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('fylke_synlighet')
    .upsert(
      {
        takstmann_id: takstmannId,
        fylke_id: fylkeId,
        er_aktiv: true,
        betalt_til: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dager
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
