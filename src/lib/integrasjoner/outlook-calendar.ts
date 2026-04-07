/**
 * Outlook Calendar integrasjon for VelgTakst
 *
 * Håndterer OAuth2-flyt og Microsoft Graph API-operasjoner for takstmenn.
 * Tokens lagres i Supabase-tabellen outlook_calendar_tokens.
 */

import { createServiceClient } from '@/lib/supabase/server'

// ============================================================
// OAuth2-konfigurasjon
// ============================================================

const TENANT = 'common'
const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const SCOPES = 'Calendars.ReadWrite offline_access User.Read'

function hentRedirectUri(): string {
  return (
    process.env.OUTLOOK_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/auth/outlook/callback`
  )
}

export function lagAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: hentRedirectUri(),
    scope: SCOPES,
    response_mode: 'query',
    state,
    prompt: 'consent', // Sikrer at vi alltid får refresh_token
  })
  return `${AUTHORIZE_URL}?${params.toString()}`
}

// ============================================================
// Token-håndtering
// ============================================================

export async function hentTokenForTakstmann(takstmannId: string) {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('outlook_calendar_tokens')
    .select('*')
    .eq('takstmann_id', takstmannId)
    .single()

  if (error || !data) return null
  return data
}

export async function lagreToken(
  takstmannId: string,
  tokens: {
    access_token: string
    refresh_token?: string | null
    expires_in?: number | null
    expires_at?: string | null
    token_type?: string | null
    scope?: string | null
  }
) {
  const supabase = await createServiceClient()

  const expiresAt = tokens.expires_at
    ? tokens.expires_at
    : tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString() // Fallback: 1 time

  const { error } = await supabase
    .from('outlook_calendar_tokens')
    .upsert(
      {
        takstmann_id: takstmannId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? 'Bearer',
      },
      { onConflict: 'takstmann_id' }
    )

  if (error) throw new Error(`Kunne ikke lagre Outlook token: ${error.message}`)
}

export async function slettToken(takstmannId: string) {
  const supabase = await createServiceClient()
  await supabase
    .from('outlook_calendar_tokens')
    .delete()
    .eq('takstmann_id', takstmannId)
}

/**
 * Bytter authorization code mot access/refresh tokens.
 */
export async function byttKodeMedTokens(code: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}> {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
    code,
    redirect_uri: hentRedirectUri(),
    grant_type: 'authorization_code',
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const tekst = await res.text()
    throw new Error(`Outlook token exchange feilet: ${tekst}`)
  }

  return res.json()
}

/**
 * Fornyer access_token ved hjelp av refresh_token.
 * Returnerer nye tokens og lagrer dem i databasen.
 */
async function fornyToken(takstmannId: string, refreshToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    client_id: process.env.OUTLOOK_CLIENT_ID!,
    client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: SCOPES,
  })

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!res.ok) {
      console.error('Outlook token refresh feilet:', await res.text())
      return null
    }

    const nyeTokens = await res.json()
    await lagreToken(takstmannId, {
      access_token: nyeTokens.access_token,
      refresh_token: nyeTokens.refresh_token ?? refreshToken,
      expires_in: nyeTokens.expires_in,
      scope: nyeTokens.scope,
      token_type: nyeTokens.token_type,
    })

    return nyeTokens.access_token
  } catch (err) {
    console.error('Outlook token refresh unntak:', err)
    return null
  }
}

/**
 * Henter et gyldig access_token for en takstmann.
 * Fornyer automatisk ved behov.
 */
async function hentGyldigAccessToken(takstmannId: string): Promise<string | null> {
  const tokenRad = await hentTokenForTakstmann(takstmannId)
  if (!tokenRad) return null

  const utløper = new Date(tokenRad.expires_at).getTime()
  const nå = Date.now()
  const marginerMs = 5 * 60 * 1000 // 5 minutters margin

  if (nå < utløper - marginerMs) {
    return tokenRad.access_token
  }

  // Token utløpt – forny
  if (tokenRad.refresh_token) {
    return await fornyToken(takstmannId, tokenRad.refresh_token)
  }

  return null
}

// ============================================================
// Hjelpefunksjon for Graph API-kall
// ============================================================

async function graphFetch(
  takstmannId: string,
  path: string,
  options: RequestInit = {}
): Promise<Response | null> {
  const accessToken = await hentGyldigAccessToken(takstmannId)
  if (!accessToken) return null

  return fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

// ============================================================
// Calendar API – hendelseshåndtering
// ============================================================

export interface KalenderHendelse {
  oppdragId: string
  tittel: string
  beskrivelse?: string | null
  adresse?: string | null
  by?: string | null
  befaringsdato?: string | null // ISO date string YYYY-MM-DD eller datetime-local
  oppdragType: string
  kundNavn?: string | null
  kundTelefon?: string | null
}

function byggEventBody(hendelse: KalenderHendelse | Partial<KalenderHendelse>, startDato: string) {
  const lokasjon = [hendelse.adresse, hendelse.by].filter(Boolean).join(', ')
  const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://takstmann.net'}/portal/takstmann/oppdrag/${'oppdragId' in hendelse ? hendelse.oppdragId : ''}`

  const beskrivelse = [
    hendelse.oppdragType ? `Oppdragstype: ${hendelse.oppdragType}` : null,
    hendelse.kundNavn ? `Kunde: ${hendelse.kundNavn}` : null,
    hendelse.kundTelefon ? `Telefon: ${hendelse.kundTelefon}` : null,
    hendelse.beskrivelse ? `\nBeskrivelse: ${hendelse.beskrivelse}` : null,
    `\nPortal: ${portalUrl}`,
  ]
    .filter(Boolean)
    .join('\n')

  // Neste dag for heldagsbegivenhet
  const sluttDato = new Date(startDato + 'T00:00:00')
  sluttDato.setDate(sluttDato.getDate() + 1)
  const sluttDatoStr = sluttDato.toISOString().split('T')[0]

  return {
    subject: hendelse.tittel,
    body: {
      contentType: 'text',
      content: beskrivelse,
    },
    location: lokasjon ? { displayName: lokasjon } : undefined,
    isAllDay: true,
    start: {
      dateTime: `${startDato}T00:00:00`,
      timeZone: 'Europe/Oslo',
    },
    end: {
      dateTime: `${sluttDatoStr}T00:00:00`,
      timeZone: 'Europe/Oslo',
    },
    categories: ['takstmann.net'],
  }
}

/**
 * Oppretter en hendelse i takstmannens Outlook-kalender.
 * Returnerer outlook_event_id.
 */
export async function opprettKalenderHendelse(
  takstmannId: string,
  hendelse: KalenderHendelse
): Promise<string | null> {
  // Ekstraher YYYY-MM-DD fra datetime-local format (f.eks. "2026-04-06T10:00")
  const rawDato = hendelse.befaringsdato ?? new Date().toISOString()
  const startDato = rawDato.split('T')[0]

  const body = byggEventBody(hendelse, startDato)

  try {
    const res = await graphFetch(takstmannId, '/me/calendar/events', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!res || !res.ok) {
      console.error('Outlook Calendar opprettHendelse feil:', res?.status, await res?.text())
      return null
    }

    const data = await res.json()
    return data.id ?? null
  } catch (err) {
    console.error('Outlook Calendar opprettHendelse unntak:', err)
    return null
  }
}

/**
 * Oppdaterer en eksisterende Outlook-kalenderhendelse.
 */
export async function oppdaterKalenderHendelse(
  takstmannId: string,
  outlookEventId: string,
  hendelse: Partial<KalenderHendelse>
): Promise<boolean> {
  try {
    // Hent eksisterende hendelse for å bevare felt vi ikke oppdaterer
    const eksRes = await graphFetch(takstmannId, `/me/calendar/events/${outlookEventId}`)
    if (!eksRes || !eksRes.ok) return false

    const eksisterende = await eksRes.json()
    const gammeltStart: string = eksisterende.start?.dateTime?.split('T')[0]
      ?? new Date().toISOString().split('T')[0]

    const startDato = hendelse.befaringsdato
      ? hendelse.befaringsdato.split('T')[0]
      : gammeltStart

    const sluttDato = new Date(startDato + 'T00:00:00')
    sluttDato.setDate(sluttDato.getDate() + 1)
    const sluttDatoStr = sluttDato.toISOString().split('T')[0]

    const oppdatering: Record<string, unknown> = {
      start: {
        dateTime: `${startDato}T00:00:00`,
        timeZone: 'Europe/Oslo',
      },
      end: {
        dateTime: `${sluttDatoStr}T00:00:00`,
        timeZone: 'Europe/Oslo',
      },
    }

    if (hendelse.tittel) oppdatering.subject = hendelse.tittel

    const lokasjonsdeler = [hendelse.adresse, hendelse.by].filter(Boolean)
    if (lokasjonsdeler.length > 0) {
      oppdatering.location = { displayName: lokasjonsdeler.join(', ') }
    }

    const res = await graphFetch(takstmannId, `/me/calendar/events/${outlookEventId}`, {
      method: 'PATCH',
      body: JSON.stringify(oppdatering),
    })

    return res?.ok ?? false
  } catch (err) {
    console.error('Outlook Calendar oppdaterHendelse feil:', err)
    return false
  }
}

/**
 * Sletter en Outlook-kalenderhendelse.
 */
export async function slettKalenderHendelse(
  takstmannId: string,
  outlookEventId: string
): Promise<boolean> {
  try {
    const res = await graphFetch(takstmannId, `/me/calendar/events/${outlookEventId}`, {
      method: 'DELETE',
    })

    // 204 No Content = suksess
    return res?.status === 204
  } catch (err) {
    console.error('Outlook Calendar slettHendelse feil:', err)
    return false
  }
}
