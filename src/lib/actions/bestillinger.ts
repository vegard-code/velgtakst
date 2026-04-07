'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { BestillingStatus, Bestilling, TakstmannProfil, Oppdrag, OppdragType } from '@/lib/supabase/types'
import {
  sendNyForespørselTilTakstmann,
  sendForespørselAkseptertVarsel,
  sendTilbudTilKunde,
  sendAkseptTilTakstmann,
} from '@/lib/integrasjoner/epost'
import {
  opprettKalenderHendelse,
  hentTokenForTakstmann,
} from '@/lib/integrasjoner/google-calendar'
import {
  opprettKalenderHendelse as opprettOutlookHendelse,
  hentTokenForTakstmann as hentOutlookTokenForTakstmann,
} from '@/lib/integrasjoner/outlook-calendar'

// ============================================================
// Rate limiting – sliding window per IP (in-memory, warm instances)
// ============================================================

const ipRateLog = new Map<string, number[]>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 time

function sjekkRateLimit(ip: string): boolean {
  const nå = Date.now()
  const vinduStart = nå - RATE_LIMIT_WINDOW_MS
  const tidspunkter = (ipRateLog.get(ip) ?? []).filter(t => t > vinduStart)

  if (tidspunkter.length >= RATE_LIMIT_MAX) {
    return false // blokkert
  }

  tidspunkter.push(nå)
  ipRateLog.set(ip, tidspunkter)

  // Rydd opp gamle IP-er periodisk for å unngå minnelekkasje
  if (ipRateLog.size > 10_000) {
    for (const [k, v] of ipRateLog) {
      if (v.every(t => t <= vinduStart)) ipRateLog.delete(k)
    }
  }

  return true // tillatt
}

function hentKlientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
  const forwarded = headersList.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headersList.get('x-real-ip') ?? 'unknown'
}

export interface BestillingMedInfo extends Bestilling {
  takstmann?: Pick<TakstmannProfil, 'id' | 'navn' | 'spesialitet' | 'telefon' | 'epost' | 'bilde_url'> | null
  oppdrag?: Oppdrag | null
  megler?: { id: string; navn: string; meglerforetak: string | null; telefon: string | null; epost: string | null } | null
  kunde?: { id: string; navn: string; telefon: string | null; epost: string | null } | null
}

export async function opprettBestilling(
  takstmannId: string,
  melding: string,
  meglerEllerKundeId: { meglerProfilId?: string; kundeProfilId?: string },
  oppdragType?: OppdragType,
  adresse?: string
) {
  const supabase = await createClient()

  // Privatkunder bruker ny tilbudsflyt, meglere bruker gammel flyt
  const bestillingStatus = meglerEllerKundeId.kundeProfilId ? 'forespørsel' : 'ny'

  const { data, error } = await supabase
    .from('bestillinger')
    .insert({
      takstmann_id: takstmannId,
      bestilt_av_megler_id: meglerEllerKundeId.meglerProfilId ?? null,
      bestilt_av_kunde_id: meglerEllerKundeId.kundeProfilId ?? null,
      melding,
      status: bestillingStatus,
      oppdrag_type: oppdragType ?? null,
      adresse: adresse ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Bestilling feilet' }

  // Send e-postvarsel til takstmann
  try {
    const [{ data: takstmann }, meglerData, kundeData] = await Promise.all([
      supabase
        .from('takstmann_profiler')
        .select('navn, epost')
        .eq('id', takstmannId)
        .maybeSingle(),
      meglerEllerKundeId.meglerProfilId
        ? supabase
            .from('megler_profiler')
            .select('navn, telefon, epost')
            .eq('id', meglerEllerKundeId.meglerProfilId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      meglerEllerKundeId.kundeProfilId
        ? supabase
            .from('privatkunde_profiler')
            .select('navn, telefon, epost')
            .eq('id', meglerEllerKundeId.kundeProfilId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const bestiller = (meglerData as { data: { navn: string; telefon: string | null; epost: string | null } | null }).data
      ?? (kundeData as { data: { navn: string; telefon: string | null; epost: string | null } | null }).data
    const bestillerType = meglerEllerKundeId.meglerProfilId ? 'megler' : 'privatkunde'

    if (takstmann?.epost && bestiller) {
      await sendNyForespørselTilTakstmann({
        til: takstmann.epost,
        takstmannNavn: takstmann.navn,
        bestillerNavn: bestiller.navn,
        bestillerType,
        bestillerTelefon: bestiller.telefon,
        bestillerEpost: bestiller.epost,
        oppdragType: oppdragType ?? null,
        adresse: adresse ?? null,
        bestillingId: data.id,
        melding: melding || null,
      })
    }
  } catch (epostFeil) {
    console.error('[Bestilling] E-postvarsel feilet:', epostFeil)
  }

  return { success: true, id: data.id }
}

const TJENESTE_TIL_OPPDRAG_TYPE: Record<string, OppdragType> = {
  'Tilstandsrapport': 'tilstandsrapport',
  'Reklamasjonsrapport': 'reklamasjonsrapport',
  'Verditakst': 'verditakst',
  'Skadetaksering': 'skadetaksering',
  'Næringstakst': 'næringstaksering',
  'Arealoppmåling': 'arealoppmaaling',
  'Tomtetakst': 'tomtetakst',
  'Byggesak': 'byggesak',
  'Naturskade': 'naturskade',
  'Forhåndstakst': 'forhåndstakst',
  'Skjønnstakst': 'skjønnstakst',
  'Brevtakst': 'brevtakst',
  'Energirådgivning': 'energirådgivning',
  'Landbrukstakst': 'landbrukstakst',
  'Våtromsinspeksjon': 'våtromsinspeksjon',
}

export async function opprettBestillingFraPublikk(input: {
  takstmannId: string
  tjeneste?: string
  adresse?: string
  melding?: string
  // Authenticated user (required)
  kundeProfilId?: string
  meglerProfilId?: string
  // Bot-beskyttelse
  honeypot?: string
}) {
  // Honeypot – bots fyller inn skjulte felt, ekte brukere gjør ikke det
  if (input.honeypot) {
    // Stille avvisning – boten tror det gikk bra
    return { success: true, id: 'bot' }
  }

  // Krev autentisering – kun innloggede brukere kan bestille
  if (!input.kundeProfilId && !input.meglerProfilId) {
    return { error: 'Du må være innlogget via Vipps for å sende en bestilling.' }
  }

  // Rate limiting per IP
  const headersList = await headers()
  const ip = hentKlientIp(headersList)
  if (!sjekkRateLimit(ip)) {
    return { error: 'Du har sendt for mange bestillinger den siste timen. Prøv igjen senere.' }
  }

  const serviceClient = await createServiceClient()
  const { takstmannId, tjeneste, adresse, kundeProfilId, meglerProfilId } = input

  const meldingTekst = input.melding ?? ''
  let bestillerNavn = 'Ukjent'
  let bestillerType: 'megler' | 'privatkunde' = 'privatkunde'
  let bestillerTelefon: string | null = null
  let bestillerEpost: string | null = null

  const oppdragType = tjeneste ? TJENESTE_TIL_OPPDRAG_TYPE[tjeneste] : undefined

  // Autentiserte privatkunder bruker ny tilbudsflyt
  const bestillingStatus = kundeProfilId ? 'forespørsel' : 'ny'

  const { data, error } = await serviceClient
    .from('bestillinger')
    .insert({
      takstmann_id: takstmannId,
      bestilt_av_megler_id: meglerProfilId ?? null,
      bestilt_av_kunde_id: kundeProfilId ?? null,
      melding: meldingTekst || null,
      status: bestillingStatus,
      oppdrag_type: oppdragType ?? null,
      adresse: adresse ?? null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Bestilling feilet' }

  // Send e-postvarsel til takstmann
  try {
    const { data: takstmann } = await serviceClient
      .from('takstmann_profiler')
      .select('navn, epost')
      .eq('id', takstmannId)
      .maybeSingle()

    if (takstmann?.epost) {
      if (meglerProfilId) {
        const { data: megler } = await serviceClient
          .from('megler_profiler')
          .select('navn, telefon, epost')
          .eq('id', meglerProfilId)
          .maybeSingle()
        bestillerNavn = (megler as { navn: string } | null)?.navn ?? 'Megler'
        bestillerTelefon = (megler as { telefon: string | null } | null)?.telefon ?? null
        bestillerEpost = (megler as { epost: string | null } | null)?.epost ?? null
        bestillerType = 'megler'
      } else if (kundeProfilId) {
        const { data: kunde } = await serviceClient
          .from('privatkunde_profiler')
          .select('navn, telefon, epost')
          .eq('id', kundeProfilId)
          .maybeSingle()
        bestillerNavn = (kunde as { navn: string } | null)?.navn ?? bestillerNavn
        bestillerTelefon = (kunde as { telefon: string | null } | null)?.telefon ?? null
        bestillerEpost = (kunde as { epost: string | null } | null)?.epost ?? null
      }

      await sendNyForespørselTilTakstmann({
        til: takstmann.epost,
        takstmannNavn: (takstmann as { navn: string }).navn,
        bestillerNavn,
        bestillerType,
        bestillerTelefon,
        bestillerEpost,
        oppdragType: oppdragType ?? null,
        adresse: adresse ?? null,
        bestillingId: data.id,
        melding: input.melding || null,
      })
    }
  } catch {
    // E-post er nice-to-have, ikke kritisk
  }

  return { success: true, id: data.id }
}

export async function oppdaterBestillingStatus(
  bestillingId: string,
  nyStatus: BestillingStatus
) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  // Hent bestillingen med relatert info før oppdatering
  const { data: bestilling } = await serviceClient
    .from('bestillinger')
    .select(`
      oppdrag_type, adresse,
      takstmann:takstmann_profiler(navn, telefon, epost),
      megler:megler_profiler(navn, epost),
      kunde:privatkunde_profiler(navn, epost)
    `)
    .eq('id', bestillingId)
    .maybeSingle()

  const { error } = await serviceClient
    .from('bestillinger')
    .update({ status: nyStatus })
    .eq('id', bestillingId)

  if (error) return { error: error.message }

  // Send akseptert-varsel til bestiller
  if (nyStatus === 'akseptert' && bestilling) {
    try {
      type TakstmannInfo = { navn: string; telefon: string | null; epost: string | null }
      type KontaktInfo = { navn: string; epost: string | null }
      const rawTakstmann = Array.isArray(bestilling.takstmann) ? bestilling.takstmann[0] : bestilling.takstmann
      const rawMegler = Array.isArray(bestilling.megler) ? bestilling.megler[0] : bestilling.megler
      const rawKunde = Array.isArray(bestilling.kunde) ? bestilling.kunde[0] : bestilling.kunde
      const takstmann = rawTakstmann as TakstmannInfo | null
      const bestiller = (rawMegler as KontaktInfo | null) ?? (rawKunde as KontaktInfo | null)

      if (bestiller?.epost && takstmann) {
        await sendForespørselAkseptertVarsel({
          til: bestiller.epost,
          bestillerNavn: bestiller.navn,
          takstmannNavn: takstmann.navn,
          takstmannTelefon: takstmann.telefon,
          takstmannEpost: takstmann.epost,
          oppdragType: bestilling.oppdrag_type,
          adresse: bestilling.adresse,
        })
      }
    } catch (epostFeil) {
      console.error('[Bestilling] Akseptert-varsel feilet:', epostFeil)
    }
  }

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
      .maybeSingle()

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
      .maybeSingle()

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

// ============================================================
// Privatkunde tilbudsflyt
// ============================================================

export async function sendTilbud(
  bestillingId: string,
  tilbudspris: number,
  estimertLeveringstid: string
) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: bestilling } = await serviceClient
    .from('bestillinger')
    .select(`
      oppdrag_type, adresse,
      kunde:privatkunde_profiler(navn, epost),
      takstmann:takstmann_profiler(navn, telefon, epost)
    `)
    .eq('id', bestillingId)
    .maybeSingle()

  const { error } = await serviceClient
    .from('bestillinger')
    .update({
      status: 'tilbud_sendt',
      tilbudspris,
      estimert_leveringstid: estimertLeveringstid,
      tilbud_sendt_at: new Date().toISOString(),
    })
    .eq('id', bestillingId)

  if (error) return { error: error.message }

  // Send e-post til kunde
  if (bestilling) {
    try {
      type TakstmannInfo = { navn: string; telefon: string | null; epost: string | null }
      type KundeInfo = { navn: string; epost: string | null }
      const rawTakstmann = Array.isArray(bestilling.takstmann) ? bestilling.takstmann[0] : bestilling.takstmann
      const rawKunde = Array.isArray(bestilling.kunde) ? bestilling.kunde[0] : bestilling.kunde
      const takstmann = rawTakstmann as TakstmannInfo | null
      const kunde = rawKunde as KundeInfo | null

      if (kunde?.epost && takstmann) {
        await sendTilbudTilKunde({
          til: kunde.epost,
          kundeNavn: kunde.navn,
          takstmannNavn: takstmann.navn,
          takstmannTelefon: takstmann.telefon,
          takstmannEpost: takstmann.epost,
          tilbudspris,
          estimertLeveringstid,
          oppdragType: bestilling.oppdrag_type,
          adresse: bestilling.adresse,
          bestillingId,
        })
      }
    } catch (err) {
      console.error('[sendTilbud] E-post feilet:', err)
    }
  }

  revalidatePath('/portal/takstmann/bestillinger')
  return { success: true }
}

export async function aksepterTilbud(
  bestillingId: string,
  befaringsdato: string,
  noekkelinfo: string,
  parkering: string,
  tilgang: string
) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: bestilling } = await serviceClient
    .from('bestillinger')
    .select(`
      oppdrag_type, adresse, tilbudspris, estimert_leveringstid,
      takstmann:takstmann_profiler(navn, epost, telefon),
      kunde:privatkunde_profiler(navn, epost)
    `)
    .eq('id', bestillingId)
    .maybeSingle()

  const { error } = await serviceClient
    .from('bestillinger')
    .update({
      status: 'akseptert',
      befaringsdato,
      noekkelinfo: noekkelinfo || null,
      parkering: parkering || null,
      tilgang: tilgang || null,
      sist_sett_kunde: new Date().toISOString(),
    })
    .eq('id', bestillingId)

  if (error) return { error: error.message }

  // Varsle takstmann
  if (bestilling) {
    try {
      type TakstmannInfo = { navn: string; epost: string | null; telefon: string | null }
      type KundeInfo = { navn: string; epost: string | null }
      const rawTakstmann = Array.isArray(bestilling.takstmann) ? bestilling.takstmann[0] : bestilling.takstmann
      const rawKunde = Array.isArray(bestilling.kunde) ? bestilling.kunde[0] : bestilling.kunde
      const takstmann = rawTakstmann as TakstmannInfo | null
      const kunde = rawKunde as KundeInfo | null

      if (takstmann?.epost && kunde) {
        await sendAkseptTilTakstmann({
          til: takstmann.epost,
          takstmannNavn: takstmann.navn,
          kundeNavn: kunde.navn,
          kundeEpost: kunde.epost,
          befaringsdato,
          noekkelinfo: noekkelinfo || null,
          parkering: parkering || null,
          tilgang: tilgang || null,
          oppdragType: bestilling.oppdrag_type,
          adresse: bestilling.adresse,
          bestillingId,
        })
      }
    } catch (err) {
      console.error('[aksepterTilbud] E-post feilet:', err)
    }
  }

  revalidatePath('/portal/kunde/bestillinger')
  return { success: true }
}

export async function avslaaTilbud(bestillingId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { error } = await serviceClient
    .from('bestillinger')
    .update({ status: 'avslått', sist_sett_kunde: new Date().toISOString() })
    .eq('id', bestillingId)

  if (error) return { error: error.message }

  revalidatePath('/portal/kunde/bestillinger')
  return { success: true }
}

export async function bekreftBestilling(bestillingId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke autentisert' }

  const { data: profil } = await serviceClient
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  const { data: takstmannProfil } = await serviceClient
    .from('takstmann_profiler')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: bestilling } = await serviceClient
    .from('bestillinger')
    .select(`
      oppdrag_type, adresse, befaringsdato, tilbudspris, noekkelinfo, parkering, tilgang,
      kunde:privatkunde_profiler(id, navn)
    `)
    .eq('id', bestillingId)
    .maybeSingle()

  if (!bestilling) return { error: 'Bestilling ikke funnet' }

  type KundeInfo = { id: string; navn: string }
  const rawKunde = Array.isArray(bestilling.kunde) ? bestilling.kunde[0] : bestilling.kunde
  const kunde = rawKunde as KundeInfo | null

  // Opprett oppdrag
  const tittel = bestilling.oppdrag_type
    ? bestilling.oppdrag_type.charAt(0).toUpperCase() + bestilling.oppdrag_type.slice(1).replace(/_/g, ' ')
    : 'Takstoppdrag'

  const beskrivelse = [
    bestilling.noekkelinfo && `Nøkkelinfo: ${bestilling.noekkelinfo}`,
    bestilling.parkering && `Parkering: ${bestilling.parkering}`,
    bestilling.tilgang && `Tilgang: ${bestilling.tilgang}`,
  ].filter(Boolean).join('\n') || null

  const { data: nyttOppdrag, error: oppdragError } = await serviceClient
    .from('oppdrag')
    .insert({
      company_id: profil?.company_id ?? null,
      takstmann_id: takstmannProfil?.id ?? null,
      privatkunde_id: kunde?.id ?? null,
      tittel,
      beskrivelse,
      adresse: bestilling.adresse,
      oppdrag_type: bestilling.oppdrag_type ?? 'annet',
      status: 'akseptert',
      befaringsdato: bestilling.befaringsdato ?? null,
      pris: bestilling.tilbudspris ?? null,
    })
    .select('id')
    .single()

  if (oppdragError || !nyttOppdrag) return { error: oppdragError?.message ?? 'Kunne ikke opprette oppdrag' }

  const hendelsesData = {
    oppdragId: nyttOppdrag.id,
    tittel,
    beskrivelse,
    adresse: bestilling.adresse,
    by: null,
    befaringsdato: bestilling.befaringsdato,
    oppdragType: bestilling.oppdrag_type ?? 'annet',
  }

  // Google Calendar sync
  if (takstmannProfil?.id && bestilling.befaringsdato) {
    try {
      const harToken = await hentTokenForTakstmann(takstmannProfil.id)
      if (harToken) {
        const googleEventId = await opprettKalenderHendelse(takstmannProfil.id, hendelsesData)
        if (googleEventId) {
          await serviceClient
            .from('oppdrag')
            .update({ google_event_id: googleEventId })
            .eq('id', nyttOppdrag.id)
        }
      }
    } catch (err) {
      console.error('[bekreftBestilling] Google Calendar feilet:', err)
    }
  }

  // Outlook Calendar sync
  if (takstmannProfil?.id && bestilling.befaringsdato) {
    try {
      const harOutlookToken = await hentOutlookTokenForTakstmann(takstmannProfil.id)
      if (harOutlookToken) {
        const outlookEventId = await opprettOutlookHendelse(takstmannProfil.id, hendelsesData)
        if (outlookEventId) {
          await serviceClient
            .from('oppdrag')
            .update({ outlook_event_id: outlookEventId })
            .eq('id', nyttOppdrag.id)
        }
      }
    } catch (err) {
      console.error('[bekreftBestilling] Outlook Calendar feilet:', err)
    }
  }

  // Oppdater bestilling
  const { error } = await serviceClient
    .from('bestillinger')
    .update({
      status: 'bekreftet',
      oppdrag_id: nyttOppdrag.id,
      sist_sett_takstmann: new Date().toISOString(),
    })
    .eq('id', bestillingId)

  if (error) return { error: error.message }

  revalidatePath('/portal/takstmann/bestillinger')
  revalidatePath('/portal/takstmann/oppdrag')
  return { success: true, oppdragId: nyttOppdrag.id }
}

export async function markerBestillingSett(
  rolle: 'kunde' | 'takstmann',
  bestillingIds: string[]
) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || bestillingIds.length === 0) return

  const now = new Date().toISOString()
  const oppdatering = rolle === 'kunde'
    ? { sist_sett_kunde: now }
    : { sist_sett_takstmann: now }

  await serviceClient
    .from('bestillinger')
    .update(oppdatering)
    .in('id', bestillingIds)
}

export async function hentAntallNyeBestillinger(): Promise<number> {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: profilData } = await serviceClient
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .maybeSingle()

  const rolle = (profilData as { rolle: string } | null)?.rolle

  if (rolle === 'takstmann' || rolle === 'takstmann_admin') {
    const { data: takstmannProfil } = await serviceClient
      .from('takstmann_profiler')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!takstmannProfil) return 0

    const { count } = await serviceClient
      .from('bestillinger')
      .select('id', { count: 'exact', head: true })
      .eq('takstmann_id', (takstmannProfil as { id: string }).id)
      .or('sist_sett_takstmann.is.null,sist_sett_takstmann.lt.updated_at')
      .in('status', ['forespørsel', 'akseptert'])

    return count ?? 0
  }

  if (rolle === 'privatkunde') {
    const { data: kundeProfil } = await serviceClient
      .from('privatkunde_profiler')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!kundeProfil) return 0

    const { count } = await serviceClient
      .from('bestillinger')
      .select('id', { count: 'exact', head: true })
      .eq('bestilt_av_kunde_id', (kundeProfil as { id: string }).id)
      .or('sist_sett_kunde.is.null,sist_sett_kunde.lt.updated_at')
      .in('status', ['tilbud_sendt', 'bekreftet'])

    return count ?? 0
  }

  return 0
}
