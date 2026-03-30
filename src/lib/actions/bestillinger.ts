'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { BestillingStatus, Bestilling, TakstmannProfil, Oppdrag } from '@/lib/supabase/types'

export interface BestillingMedInfo extends Bestilling {
  takstmann?: Pick<TakstmannProfil, 'id' | 'navn' | 'spesialitet' | 'telefon' | 'epost' | 'bilde_url'> | null
  oppdrag?: Oppdrag | null
  megler?: { id: string; navn: string; meglerforetak: string | null; telefon: string | null; epost: string | null } | null
  kunde?: { id: string; navn: string; telefon: string | null; epost: string | null } | null
}

export async function opprettBestilling(
  takstmannId: string,
  melding: string,
  meglerEllerKundeId: { meglerProfilId?: string; kundeProfilId?: string }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bestillinger')
    .insert({
      takstmann_id: takstmannId,
      bestilt_av_megler_id: meglerEllerKundeId.meglerProfilId ?? null,
      bestilt_av_kunde_id: meglerEllerKundeId.kundeProfilId ?? null,
      melding,
      status: 'ny',
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Bestilling feilet' }
  return { success: true, id: data.id }
}

export async function oppdaterBestillingStatus(
  bestillingId: string,
  nyStatus: BestillingStatus
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bestillinger')
    .update({ status: nyStatus })
    .eq('id', bestillingId)

  if (error) return { error: error.message }

  revalidatePath('/portal/takstmann/bestillinger')
  revalidatePath('/portal/megler/bestillinger')
  revalidatePath('/portal/kunde/oppdrag')
  return { success: true }
}

export async function hentMinebestillinger(rolle: 'megler' | 'kunde'): Promise<BestillingMedInfo[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  if (rolle === 'megler') {
    const { data: profil } = await supabase
      .from('megler_profiler')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profil) return []

    const { data } = await supabase
      .from('bestillinger')
      .select(`
        *,
        takstmann:takstmann_profiler(id, navn, spesialitet, telefon, epost, bilde_url),
        oppdrag(*)
      `)
      .eq('bestilt_av_megler_id', (profil as { id: string }).id)
      .order('created_at', { ascending: false })

    return (data ?? []) as unknown as BestillingMedInfo[]
  } else {
    const { data: profil } = await supabase
      .from('privatkunde_profiler')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profil) return []

    const { data } = await supabase
      .from('bestillinger')
      .select(`
        *,
        takstmann:takstmann_profiler(id, navn, spesialitet, telefon, epost, bilde_url),
        oppdrag(*)
      `)
      .eq('bestilt_av_kunde_id', (profil as { id: string }).id)
      .order('created_at', { ascending: false })

    return (data ?? []) as unknown as BestillingMedInfo[]
  }
}
