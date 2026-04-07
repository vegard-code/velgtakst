'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { OppdragStatus, OppdragType } from '@/lib/supabase/types'
import {
  opprettKalenderHendelse,
  oppdaterKalenderHendelse,
  slettKalenderHendelse,
  hentTokenForTakstmann,
} from '@/lib/integrasjoner/google-calendar'
import {
  opprettKalenderHendelse as opprettOutlookHendelse,
  oppdaterKalenderHendelse as oppdaterOutlookHendelse,
  slettKalenderHendelse as slettOutlookHendelse,
  hentTokenForTakstmann as hentOutlookTokenForTakstmann,
} from '@/lib/integrasjoner/outlook-calendar'
import {
  sendStatusOppdateringVarsel,
  sendNyRapportVarsel,
} from '@/lib/integrasjoner/epost'

// ============================================================
// HENT OPPDRAG
// ============================================================
export async function hentOppdragListe(filter?: {
  status?: OppdragStatus
  type?: OppdragType
  takstmannId?: string
  sok?: string
}) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profil } = await serviceClient
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  let query = serviceClient
    .from('oppdrag')
    .select(`
      *,
      takstmann:takstmann_profiler(id, navn, spesialitet),
      megler:megler_profiler(id, navn, meglerforetak),
      privatkunde:privatkunde_profiler(id, navn)
    `)
    .order('created_at', { ascending: false })

  // Scope til brukerens bedrift
  if (profil?.company_id) {
    query = query.eq('company_id', profil.company_id)
  }

  if (filter?.status) query = query.eq('status', filter.status)
  if (filter?.type) query = query.eq('oppdrag_type', filter.type)
  if (filter?.takstmannId) query = query.eq('takstmann_id', filter.takstmannId)
  if (filter?.sok) {
    query = query.or(
      `tittel.ilike.%${filter.sok}%,adresse.ilike.%${filter.sok}%,by.ilike.%${filter.sok}%`
    )
  }

  const { data, error } = await query
  if (error) {
    console.error('hentOppdragListe error:', error.message)
    return []
  }
  return data ?? []
}

export async function hentOppdragDetaljer(id: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  // Verifiser at bruker er autentisert
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await serviceClient
    .from('oppdrag')
    .select(`
      *,
      takstmann:takstmann_profiler(id, navn, spesialitet, telefon, epost),
      megler:megler_profiler(id, navn, meglerforetak, telefon, epost),
      privatkunde:privatkunde_profiler(id, navn, telefon, epost),
      status_logg(*),
      dokumenter(*),
      purre_logg(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

// ============================================================
// OPPRETT OPPDRAG
// ============================================================
export async function opprettOppdrag(formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Bruk service client for å unngå RLS-rekursjon
  const { data: profil } = await serviceClient
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profil?.company_id) return { error: 'Ingen bedrift funnet' }

  const { data: takstmannProfil } = await serviceClient
    .from('takstmann_profiler')
    .select('id')
    .eq('user_id', user.id)
    .single()

  const { data, error } = await serviceClient
    .from('oppdrag')
    .insert({
      company_id: profil.company_id,
      takstmann_id: (formData.get('takstmann_id') as string) || takstmannProfil?.id || null,
      tittel: formData.get('tittel') as string,
      beskrivelse: (formData.get('beskrivelse') as string) || null,
      adresse: (formData.get('adresse') as string) || null,
      postnr: (formData.get('postnr') as string) || null,
      by: (formData.get('by') as string) || null,
      oppdrag_type: formData.get('oppdrag_type') as OppdragType,
      frist: (formData.get('frist') as string) || null,
      befaringsdato: (formData.get('befaringsdato') as string) || null,
      pris: formData.get('pris') ? Number(formData.get('pris')) : null,
      status: 'ny',
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Kunne ikke opprette oppdrag' }

  await serviceClient.from('status_logg').insert({
    oppdrag_id: data.id,
    fra_status: null,
    til_status: 'ny',
    endret_av: user.id,
    notat: 'Oppdrag opprettet',
  })

  const befaringsdato = (formData.get('befaringsdato') as string) || null
  const hendelsesData = {
    oppdragId: data.id,
    tittel: formData.get('tittel') as string,
    beskrivelse: (formData.get('beskrivelse') as string) || null,
    adresse: (formData.get('adresse') as string) || null,
    by: (formData.get('by') as string) || null,
    befaringsdato,
    oppdragType: formData.get('oppdrag_type') as string,
  }

  // Google Calendar sync
  if (takstmannProfil?.id && befaringsdato) {
    try {
      const harToken = await hentTokenForTakstmann(takstmannProfil.id)
      if (harToken) {
        const googleEventId = await opprettKalenderHendelse(takstmannProfil.id, hendelsesData)
        if (googleEventId) {
          await serviceClient
            .from('oppdrag')
            .update({ google_event_id: googleEventId })
            .eq('id', data.id)
        }
      }
    } catch (err) {
      console.error('[opprettOppdrag] Google Calendar feilet:', err)
    }
  }

  // Outlook Calendar sync
  if (takstmannProfil?.id && befaringsdato) {
    try {
      const harOutlookToken = await hentOutlookTokenForTakstmann(takstmannProfil.id)
      if (harOutlookToken) {
        const outlookEventId = await opprettOutlookHendelse(takstmannProfil.id, hendelsesData)
        if (outlookEventId) {
          await serviceClient
            .from('oppdrag')
            .update({ outlook_event_id: outlookEventId })
            .eq('id', data.id)
        }
      }
    } catch (err) {
      console.error('[opprettOppdrag] Outlook Calendar feilet:', err)
    }
  }

  revalidatePath('/portal/takstmann/oppdrag')
  redirect(`/portal/takstmann/oppdrag/${data.id}`)
}

// ============================================================
// OPPDATER STATUS
// ============================================================
export async function oppdaterOppdragStatus(
  oppdragId: string,
  nyStatus: OppdragStatus,
  notat?: string
) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: gammelt } = await serviceClient
    .from('oppdrag')
    .select(`
      status, tittel,
      megler:megler_profiler(navn, epost),
      privatkunde:privatkunde_profiler(navn, epost)
    `)
    .eq('id', oppdragId)
    .single()

  const { error } = await serviceClient
    .from('oppdrag')
    .update({ status: nyStatus })
    .eq('id', oppdragId)

  if (error) return { error: error.message }

  await serviceClient.from('status_logg').insert({
    oppdrag_id: oppdragId,
    fra_status: gammelt?.status ?? null,
    til_status: nyStatus,
    endret_av: user.id,
    notat: notat || null,
  })

  // Send e-postvarsel til bestiller
  try {
    type KontaktInfo = { navn: string; epost: string | null }
    const rawMegler = Array.isArray(gammelt?.megler) ? gammelt.megler[0] : gammelt?.megler
    const rawPrivatkunde = Array.isArray(gammelt?.privatkunde) ? gammelt.privatkunde[0] : gammelt?.privatkunde
    const bestiller = (rawMegler as KontaktInfo | null) ?? (rawPrivatkunde as KontaktInfo | null)

    if (bestiller?.epost && gammelt?.tittel) {
      if (nyStatus === 'rapport_levert') {
        // Hent navn på rapporten hvis den finnes
        const { data: rapport } = await serviceClient
          .from('dokumenter')
          .select('navn')
          .eq('oppdrag_id', oppdragId)
          .eq('er_rapport', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        await sendNyRapportVarsel({
          til: bestiller.epost,
          bestillerNavn: bestiller.navn,
          oppdragTittel: gammelt.tittel,
          oppdragId,
          rapportNavn: rapport?.navn ?? null,
        })
      } else {
        await sendStatusOppdateringVarsel({
          til: bestiller.epost,
          bestillerNavn: bestiller.navn,
          nyStatus,
          oppdragTittel: gammelt.tittel,
          oppdragId,
        })
      }
    }
  } catch (epostFeil) {
    console.error('[Oppdrag] Statusvarsel feilet:', epostFeil)
  }

  revalidatePath(`/portal/takstmann/oppdrag/${oppdragId}`)
  revalidatePath('/portal/takstmann/oppdrag')
  return { success: true }
}

// ============================================================
// OPPDATER OPPDRAG
// ============================================================
export async function oppdaterOppdrag(id: string, formData: FormData) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Hent eksisterende oppdrag for å få event IDs og takstmann_id
  const { data: eksisterende } = await serviceClient
    .from('oppdrag')
    .select('google_event_id, outlook_event_id, takstmann_id')
    .eq('id', id)
    .single()

  const { error } = await serviceClient
    .from('oppdrag')
    .update({
      tittel: formData.get('tittel') as string,
      beskrivelse: (formData.get('beskrivelse') as string) || null,
      adresse: (formData.get('adresse') as string) || null,
      postnr: (formData.get('postnr') as string) || null,
      by: (formData.get('by') as string) || null,
      oppdrag_type: formData.get('oppdrag_type') as OppdragType,
      frist: (formData.get('frist') as string) || null,
      befaringsdato: (formData.get('befaringsdato') as string) || null,
      pris: formData.get('pris') ? Number(formData.get('pris')) : null,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  if (eksisterende?.takstmann_id) {
    const { data: takstmannProfil } = await serviceClient
      .from('takstmann_profiler')
      .select('id')
      .eq('id', eksisterende.takstmann_id)
      .single()

    if (takstmannProfil) {
      const nyBefaringsdato = (formData.get('befaringsdato') as string) || null
      const oppdatertHendelse = {
        tittel: formData.get('tittel') as string,
        adresse: (formData.get('adresse') as string) || null,
        by: (formData.get('by') as string) || null,
        befaringsdato: nyBefaringsdato ?? undefined,
      }

      // Google Calendar sync
      try {
        if (eksisterende.google_event_id) {
          await oppdaterKalenderHendelse(takstmannProfil.id, eksisterende.google_event_id, oppdatertHendelse)
        } else if (nyBefaringsdato) {
          const harToken = await hentTokenForTakstmann(takstmannProfil.id)
          if (harToken) {
            const googleEventId = await opprettKalenderHendelse(takstmannProfil.id, {
              oppdragId: id,
              tittel: formData.get('tittel') as string,
              beskrivelse: (formData.get('beskrivelse') as string) || null,
              adresse: (formData.get('adresse') as string) || null,
              by: (formData.get('by') as string) || null,
              befaringsdato: nyBefaringsdato,
              oppdragType: formData.get('oppdrag_type') as string,
            })
            if (googleEventId) {
              await serviceClient
                .from('oppdrag')
                .update({ google_event_id: googleEventId })
                .eq('id', id)
            }
          }
        }
      } catch (err) {
        console.error('[oppdaterOppdrag] Google Calendar feilet:', err)
      }

      // Outlook Calendar sync
      try {
        if (eksisterende.outlook_event_id) {
          await oppdaterOutlookHendelse(takstmannProfil.id, eksisterende.outlook_event_id, oppdatertHendelse)
        } else if (nyBefaringsdato) {
          const harOutlookToken = await hentOutlookTokenForTakstmann(takstmannProfil.id)
          if (harOutlookToken) {
            const outlookEventId = await opprettOutlookHendelse(takstmannProfil.id, {
              oppdragId: id,
              tittel: formData.get('tittel') as string,
              beskrivelse: (formData.get('beskrivelse') as string) || null,
              adresse: (formData.get('adresse') as string) || null,
              by: (formData.get('by') as string) || null,
              befaringsdato: nyBefaringsdato,
              oppdragType: formData.get('oppdrag_type') as string,
            })
            if (outlookEventId) {
              await serviceClient
                .from('oppdrag')
                .update({ outlook_event_id: outlookEventId })
                .eq('id', id)
            }
          }
        }
      } catch (err) {
        console.error('[oppdaterOppdrag] Outlook Calendar feilet:', err)
      }
    }
  }

  revalidatePath(`/portal/takstmann/oppdrag/${id}`)
  return { success: true }
}

// ============================================================
// SLETT OPPDRAG
// ============================================================
export async function slettOppdrag(id: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Hent event IDs og takstmann_id før vi kansellerer
  const { data: oppdrag } = await serviceClient
    .from('oppdrag')
    .select('google_event_id, outlook_event_id, takstmann_id')
    .eq('id', id)
    .single()

  const { error } = await serviceClient
    .from('oppdrag')
    .update({ status: 'kansellert' })
    .eq('id', id)

  if (error) return { error: error.message }

  // Slett fra Google Calendar hvis den finnes
  if (oppdrag?.google_event_id && oppdrag.takstmann_id) {
    try {
      await slettKalenderHendelse(oppdrag.takstmann_id, oppdrag.google_event_id)
    } catch (err) {
      console.error('[slettOppdrag] Google Calendar feilet:', err)
    }
  }

  // Slett fra Outlook Calendar hvis den finnes
  if (oppdrag?.outlook_event_id && oppdrag.takstmann_id) {
    try {
      await slettOutlookHendelse(oppdrag.takstmann_id, oppdrag.outlook_event_id)
    } catch (err) {
      console.error('[slettOppdrag] Outlook Calendar feilet:', err)
    }
  }

  revalidatePath('/portal/takstmann/oppdrag')
  return { success: true }
}

// ============================================================
// DASHBOARD STATS
// ============================================================
export async function hentDashboardStats() {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profil } = await serviceClient
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profil?.company_id) return null

  const [statusTeller, nyeOppdrag, kommendeFrister, nyeBestillinger] = await Promise.all([
    serviceClient
      .from('oppdrag')
      .select('status')
      .eq('company_id', profil.company_id)
      .neq('status', 'kansellert'),

    serviceClient
      .from('oppdrag')
      .select('id, tittel, adresse, by, oppdrag_type, created_at')
      .eq('company_id', profil.company_id)
      .eq('status', 'ny')
      .order('created_at', { ascending: false })
      .limit(5),

    serviceClient
      .from('oppdrag')
      .select('id, tittel, frist, status')
      .eq('company_id', profil.company_id)
      .not('frist', 'is', null)
      .in('status', ['ny', 'akseptert', 'under_befaring', 'rapport_under_arbeid'])
      .order('frist', { ascending: true })
      .limit(5),

    serviceClient
      .from('bestillinger')
      .select('id, melding, created_at, takstmann_id')
      .eq('status', 'ny')
      .limit(5),
  ])

  const statusMap: Record<string, number> = {}
  for (const o of statusTeller.data ?? []) {
    statusMap[o.status] = (statusMap[o.status] ?? 0) + 1
  }

  return {
    statusMap,
    totalOppdrag: (statusTeller.data ?? []).length,
    nyeOppdrag: nyeOppdrag.data ?? [],
    kommendeFrister: kommendeFrister.data ?? [],
    nyeBestillinger: nyeBestillinger.data ?? [],
  }
}
