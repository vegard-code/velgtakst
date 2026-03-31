'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ============================================================
// Hent eller opprett samtale
// ============================================================

export async function hentEllerOpprettSamtale({
  takstmannId,
  bestillingId,
}: {
  takstmannId: string
  bestillingId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke innlogget' }

  // Finn rolle
  const { data: profil } = await supabase
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .single()
  if (!profil) return { error: 'Fant ikke profil' }

  let kundeId: string | null = null
  let meglerId: string | null = null

  if (profil.rolle === 'privatkunde') {
    const { data } = await supabase
      .from('privatkunde_profiler')
      .select('id')
      .eq('user_id', user.id)
      .single()
    kundeId = data?.id ?? null
  } else if (profil.rolle === 'megler') {
    const { data } = await supabase
      .from('megler_profiler')
      .select('id')
      .eq('user_id', user.id)
      .single()
    meglerId = data?.id ?? null
  } else if (profil.rolle === 'takstmann' || profil.rolle === 'takstmann_admin') {
    // Takstmann starter samtale — sjekk at vi har bestilling
    // Takstmannen er allerede takstmann_id
  } else {
    return { error: 'Ugyldig rolle' }
  }

  // Søk etter eksisterende samtale
  let query = supabase
    .from('samtaler')
    .select('id')
    .eq('takstmann_id', takstmannId)

  if (bestillingId) {
    query = query.eq('bestilling_id', bestillingId)
  }
  if (kundeId) query = query.eq('kunde_id', kundeId)
  if (meglerId) query = query.eq('megler_id', meglerId)

  const { data: eksisterende } = await query.maybeSingle()
  if (eksisterende) return { samtaleId: eksisterende.id }

  // Opprett ny samtale
  const insertData: Record<string, unknown> = {
    takstmann_id: takstmannId,
    bestilling_id: bestillingId ?? null,
    kunde_id: kundeId,
    megler_id: meglerId,
  }

  const { data: ny, error } = await supabase
    .from('samtaler')
    .insert(insertData)
    .select('id')
    .single()

  if (error) {
    console.error('Opprett samtale error:', error)
    return { error: 'Kunne ikke opprette samtale' }
  }

  return { samtaleId: ny.id }
}

// ============================================================
// Send melding
// ============================================================

export async function sendMelding({
  samtaleId,
  innhold,
}: {
  samtaleId: string
  innhold: string
}) {
  if (!innhold.trim()) return { error: 'Meldingen kan ikke være tom' }
  if (innhold.length > 2000) return { error: 'Meldingen er for lang (maks 2000 tegn)' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke innlogget' }

  const { error } = await supabase.from('meldinger').insert({
    samtale_id: samtaleId,
    avsender_id: user.id,
    innhold: innhold.trim(),
    lest: false,
  })

  if (error) {
    console.error('Send melding error:', error)
    return { error: 'Kunne ikke sende meldingen' }
  }

  revalidatePath('/portal/takstmann/meldinger')
  revalidatePath('/portal/kunde/meldinger')
  revalidatePath('/portal/megler/meldinger')
  return { success: true }
}

// ============================================================
// Hent meldinger for en samtale
// ============================================================

export async function hentMeldinger(samtaleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('meldinger')
    .select('*')
    .eq('samtale_id', samtaleId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Hent meldinger error:', error)
    return []
  }

  return data ?? []
}

// ============================================================
// Marker meldinger som lest
// ============================================================

export async function markerSomLest(samtaleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Marker alle meldinger i samtalen som IKKE er fra oss som lest
  await supabase
    .from('meldinger')
    .update({ lest: true, lest_tidspunkt: new Date().toISOString() })
    .eq('samtale_id', samtaleId)
    .neq('avsender_id', user.id)
    .eq('lest', false)
}

// ============================================================
// Hent alle samtaler for innlogget bruker
// ============================================================

export async function hentSamtaler() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profil } = await supabase
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .single()
  if (!profil) return []

  const { data: samtaler, error } = await supabase
    .from('samtaler')
    .select(`
      id, bestilling_id, takstmann_id, kunde_id, megler_id, created_at,
      takstmann:takstmann_profiler(id, navn, bilde_url),
      kunde:privatkunde_profiler(id, navn),
      megler:megler_profiler(id, navn)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Hent samtaler error:', error)
    return []
  }

  // For each samtale, get the latest message and unread count
  const result = await Promise.all(
    (samtaler ?? []).map(async (s) => {
      const { data: sisteMelding } = await supabase
        .from('meldinger')
        .select('innhold, created_at, avsender_id')
        .eq('samtale_id', s.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count } = await supabase
        .from('meldinger')
        .select('id', { count: 'exact', head: true })
        .eq('samtale_id', s.id)
        .neq('avsender_id', user.id)
        .eq('lest', false)

      return {
        ...s,
        takstmann: s.takstmann as unknown as { id: string; navn: string; bilde_url: string | null } | null,
        kunde: s.kunde as unknown as { id: string; navn: string } | null,
        megler: s.megler as unknown as { id: string; navn: string } | null,
        siste_melding: sisteMelding ?? null,
        uleste: count ?? 0,
      }
    })
  )

  // Sort by latest message
  result.sort((a, b) => {
    const aTime = a.siste_melding?.created_at ?? a.created_at
    const bTime = b.siste_melding?.created_at ?? b.created_at
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })

  return result
}

// ============================================================
// Hent antall uleste meldinger totalt
// ============================================================

export async function hentAntallUleste(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  // Finn alle samtaler brukeren er del av
  const { data: samtaler } = await supabase
    .from('samtaler')
    .select('id')

  if (!samtaler || samtaler.length === 0) return 0

  const samtaleIds = samtaler.map((s) => s.id)

  const { count } = await supabase
    .from('meldinger')
    .select('id', { count: 'exact', head: true })
    .in('samtale_id', samtaleIds)
    .neq('avsender_id', user.id)
    .eq('lest', false)

  return count ?? 0
}

// ============================================================
// Varsel-innstillinger
// ============================================================

export async function hentVarselInnstillinger() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('varsel_innstillinger')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return data
}

export async function oppdaterVarselInnstillinger({
  epostMeldinger,
}: {
  epostMeldinger: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke innlogget' }

  // Upsert
  const { data: eksisterende } = await supabase
    .from('varsel_innstillinger')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (eksisterende) {
    await supabase
      .from('varsel_innstillinger')
      .update({ epost_meldinger: epostMeldinger, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  } else {
    await supabase
      .from('varsel_innstillinger')
      .insert({ user_id: user.id, epost_meldinger: epostMeldinger })
  }

  return { success: true }
}
