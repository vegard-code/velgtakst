'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function sendVurdering({
  takstmannId,
  meglerProfilId,
  oppdragId,
  karakter,
  kommentar,
}: {
  takstmannId: string
  meglerProfilId: string
  oppdragId?: string
  karakter: number
  kommentar?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase.from('megler_vurderinger').insert({
    takstmann_id: takstmannId,
    megler_id: meglerProfilId,
    oppdrag_id: oppdragId ?? null,
    karakter,
    kommentar: kommentar || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/takstmann/${takstmannId}`)
  return { success: true }
}
