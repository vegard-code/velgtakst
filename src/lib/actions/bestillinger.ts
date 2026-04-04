'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { BestillingStatus, Bestilling, TakstmannProfil, Oppdrag, OppdragType } from '@/lib/supabase/types'
import {
  sendNyForespørselTilTakstmann,
  sendForespørselAkseptertVarsel,
} from '@/lib/integrasjoner/epost'

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

  const { data, error } = await supabase
    .from('bestillinger')
    .insert({
      takstmann_id: takstmannId,
      bestilt_av_megler_id: meglerEllerKundeId.meglerProfilId ?? null,
      bestilt_av_kunde_id: meglerEllerKundeId.kundeProfilId ?? null,
      melding,
      status: 'ny',
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
        .single(),
      meglerEllerKundeId.meglerProfilId
        ? supabase
            .from('megler_profiler')
            .select('navn, telefon, epost')
            .eq('id', meglerEllerKundeId.meglerProfilId)
            .single()
        : Promise.resolve({ data: null }),
      meglerEllerKundeId.kundeProfilId
        ? supabase
            .from('privatkunde_profiler')
            .select('navn, telefon, epost')
            .eq('id', meglerEllerKundeId.kundeProfilId)
            .single()
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
  // Authenticated user
  kundeProfilId?: string
  meglerProfilId?: string
  // Guest info (unauthenticated)
  guestNavn?: string
  guestEpost?: string
  guestTelefon?: string
  // Bot-beskyttelse
  honeypot?: string
}) {
  // Honeypot – bots fyller inn skjulte felt, ekte brukere gjør ikke det
  if (input.honeypot) {
    // Stille avvisning – boten tror det gikk bra
    return { success: true, id: 'bot' }
  }

  // Rate limiting per IP
  const headersList = await headers()
  const ip = hentKlientIp(headersList)
  if (!sjekkRateLimit(ip)) {
    return { error: 'Du har sendt for mange bestillinger den siste timen. Prøv igjen senere.' }
  }

  // Bruker serviceClient for å unngå RLS-problemer med gjester (uinnloggede brukere)
  const serviceClient = await createServiceClient()
  const { takstmannId, tjeneste, adresse, kundeProfilId, meglerProfilId } = input

  // Build melding – prepend guest contact info when not authenticated
  let meldingTekst = input.melding ?? ''
  let bestillerNavn = 'Ukjent'
  let bestillerType: 'megler' | 'privatkunde' = 'privatkunde'
  let bestillerTelefon: string | null = null
  let bestillerEpost: string | null = null

  if (!kundeProfilId && !meglerProfilId && input.guestNavn) {
    const kontaktLinjer = [`Kontaktinfo: ${input.guestNavn}`]
    if (input.guestTelefon) kontaktLinjer.push(`Tlf: ${input.guestTelefon}`)
    if (input.guestEpost) kontaktLinjer.push(`E-post: ${input.guestEpost}`)
    meldingTekst = kontaktLinjer.join('\n') + (meldingTekst ? '\n\n' + meldingTekst : '')
    bestillerNavn = input.guestNavn
    bestillerTelefon = input.guestTelefon ?? null
    bestillerEpost = input.guestEpost ?? null
  }

  const oppdragType = tjeneste ? TJENESTE_TIL_OPPDRAG_TYPE[tjeneste] : undefined

  const { data, error } = await serviceClient
    .from('bestillinger')
    .insert({
      takstmann_id: takstmannId,
      bestilt_av_megler_id: meglerProfilId ?? null,
      bestilt_av_kunde_id: kundeProfilId ?? null,
      melding: meldingTekst || null,
      status: 'ny',
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
      .single()

    if (takstmann?.epost) {
      if (meglerProfilId) {
        const { data: megler } = await serviceClient
          .from('megler_profiler')
          .select('navn, telefon, epost')
          .eq('id', meglerProfilId)
          .single()
        bestillerNavn = (megler as { navn: string } | null)?.navn ?? 'Megler'
        bestillerTelefon = (megler as { telefon: string | null } | null)?.telefon ?? null
        bestillerEpost = (megler as { epost: string | null } | null)?.epost ?? null
        bestillerType = 'megler'
      } else if (kundeProfilId) {
        const { data: kunde } = await serviceClient
          .from('privatkunde_profiler')
          .select('navn, telefon, epost')
          .eq('id', kundeProfilId)
          .single()
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
    .single()

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
