'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Send vurdering av takstmann (fra megler eller privatkunde)
 */
export async function sendVurdering({
  takstmannId,
  bestillingId,
  karakter,
  kommentar,
}: {
  takstmannId: string
  bestillingId?: string
  karakter: number
  kommentar?: string
}) {
  if (karakter < 1 || karakter > 5) {
    return { error: 'Karakter må være mellom 1 og 5' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke innlogget' }

  // Finn brukerens rolle og profil
  const { data: profil, error: profilError } = await supabase
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .maybeSingle()

  if (profilError) {
    console.error('[user_profiles] Feil ved henting av profil i sendVurdering:', profilError.message)
    return { error: 'Feil ved henting av profil' }
  }
  if (!profil) return { error: 'Fant ikke profil' }

  let meglerId: string | null = null
  let kundeId: string | null = null

  if (profil.rolle === 'megler') {
    const { data: meglerProfil, error: meglerProfilError } = await supabase
      .from('megler_profiler')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (meglerProfilError) {
      console.error('[megler_profiler] Feil ved henting av meglerprofil i sendVurdering:', meglerProfilError.message)
      return { error: 'Feil ved henting av meglerprofil' }
    }
    meglerId = meglerProfil?.id ?? null
  } else if (profil.rolle === 'privatkunde') {
    const { data: kundeProfil, error: kundeProfilError } = await supabase
      .from('privatkunde_profiler')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (kundeProfilError) {
      console.error('[privatkunde_profiler] Feil ved henting av kundeprofil i sendVurdering:', kundeProfilError.message)
      return { error: 'Feil ved henting av kundeprofil' }
    }
    kundeId = kundeProfil?.id ?? null
  } else {
    return { error: 'Kun kunder og meglere kan gi vurderinger' }
  }

  if (!meglerId && !kundeId) {
    return { error: 'Fant ikke din profil' }
  }

  // Sjekk at brukeren har en fullført bestilling hos denne takstmannen
  {
    const baseQuery = meglerId
      ? supabase
          .from('bestillinger')
          .select('id')
          .eq('takstmann_id', takstmannId)
          .eq('status', 'fullfort')
          .eq('bestilt_av_megler_id', meglerId)
      : supabase
          .from('bestillinger')
          .select('id')
          .eq('takstmann_id', takstmannId)
          .eq('status', 'fullfort')
          .eq('bestilt_av_kunde_id', kundeId!)

    const { data: fullfortBestilling } = await (bestillingId
      ? baseQuery.eq('id', bestillingId)
      : baseQuery
    ).maybeSingle()

    if (!fullfortBestilling) {
      return { error: 'Du kan bare gi vurdering til takstmenn du har en fullført bestilling hos' }
    }
  }

  // Sjekk om brukeren allerede har gitt vurdering for denne bestillingen
  if (bestillingId) {
    const { data: eksisterende } = await supabase
      .from('megler_vurderinger')
      .select('id')
      .eq('takstmann_id', takstmannId)
      .eq('oppdrag_id', bestillingId)
      .maybeSingle()

    if (eksisterende) {
      return { error: 'Du har allerede gitt en vurdering for dette oppdraget' }
    }
  }

  const { error } = await supabase.from('megler_vurderinger').insert({
    takstmann_id: takstmannId,
    megler_id: meglerId,
    kunde_id: kundeId,
    oppdrag_id: bestillingId ?? null,
    karakter,
    kommentar: kommentar?.trim() || null,
  })

  if (error) {
    console.error('Vurdering insert error:', error)
    return { error: 'Kunne ikke lagre vurderingen. Prøv igjen.' }
  }

  revalidatePath(`/takstmann/${takstmannId}`)
  revalidatePath(`/portal/kunde/oppdrag/${bestillingId}`)
  return { success: true }
}

/**
 * Hent vurderinger for en takstmann
 */
export async function hentVurderinger(takstmannId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('megler_vurderinger')
    .select(`
      id, karakter, kommentar, created_at,
      megler:megler_profiler(navn),
      kunde:privatkunde_profiler(navn)
    `)
    .eq('takstmann_id', takstmannId)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data ?? []).map((v) => {
    const megler = v.megler as unknown as { navn: string } | null
    const kunde = v.kunde as unknown as { navn: string } | null
    return {
      id: v.id,
      karakter: v.karakter,
      kommentar: v.kommentar,
      created_at: v.created_at,
      avsenderNavn: megler?.navn ?? kunde?.navn ?? 'Anonym',
    }
  })
}
