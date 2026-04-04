/**
 * Google Calendar integrasjon for VelgTakst
 *
 * Håndterer OAuth2-flyt og Calendar API-operasjoner for takstmenn.
 * Tokens lagres i Supabase-tabellen google_calendar_tokens.
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createServiceClient } from '@/lib/supabase/server'

// ============================================================
// OAuth2-konfigurasjon
// ============================================================

export function lagOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/auth/google/callback`
  )
}

export function lagAuthUrl(state: string): string {
  const oauth2Client = lagOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Sikrer at vi alltid får refresh_token
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state,
  })
}

// ============================================================
// Token-håndtering
// ============================================================

export async function hentTokenForTakstmann(takstmannId: string) {
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('google_calendar_tokens')
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
    expiry_date?: number | null
    token_type?: string | null
    scope?: string | null
  }
) {
  const supabase = await createServiceClient()

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString() // Fallback: 1 time

  const { error } = await supabase
    .from('google_calendar_tokens')
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

  if (error) throw new Error(`Kunne ikke lagre Google token: ${error.message}`)
}

export async function slettToken(takstmannId: string) {
  const supabase = await createServiceClient()
  await supabase
    .from('google_calendar_tokens')
    .delete()
    .eq('takstmann_id', takstmannId)
}

/**
 * Lager en autentisert OAuth2-klient for en gitt takstmann.
 * Fornyer access_token automatisk ved behov.
 */
export async function lagAutentisertKlient(takstmannId: string): Promise<OAuth2Client | null> {
  const tokenRad = await hentTokenForTakstmann(takstmannId)
  if (!tokenRad) return null

  const oauth2Client = lagOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokenRad.access_token,
    refresh_token: tokenRad.refresh_token,
    expiry_date: new Date(tokenRad.expires_at).getTime(),
    token_type: tokenRad.token_type,
    scope: tokenRad.scope,
  })

  // Sett opp automatisk lagring av nye tokens etter refresh
  oauth2Client.on('tokens', async (nyeTokens) => {
    if (nyeTokens.access_token) {
      await lagreToken(takstmannId, {
        access_token: nyeTokens.access_token,
        refresh_token: nyeTokens.refresh_token ?? tokenRad.refresh_token,
        expiry_date: nyeTokens.expiry_date,
        scope: nyeTokens.scope ?? tokenRad.scope,
        token_type: nyeTokens.token_type ?? tokenRad.token_type,
      })
    }
  })

  return oauth2Client
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
  befaringsdato?: string | null // ISO date string YYYY-MM-DD
  oppdragType: string
  kundNavn?: string | null
  kundTelefon?: string | null
}

/**
 * Oppretter en hendelse i takstmannens primærkalender.
 * Returnerer google_event_id.
 */
export async function opprettKalenderHendelse(
  takstmannId: string,
  hendelse: KalenderHendelse
): Promise<string | null> {
  const auth = await lagAutentisertKlient(takstmannId)
  if (!auth) return null

  const calendar = google.calendar({ version: 'v3', auth })

  // Ekstraher YYYY-MM-DD fra datetime-local format (f.eks. "2026-04-06T10:00")
  const rawDato = hendelse.befaringsdato ?? new Date().toISOString()
  const startDato = rawDato.split('T')[0]
  const lokasjon = [hendelse.adresse, hendelse.by].filter(Boolean).join(', ')

  const beskrivelse = [
    `Oppdragstype: ${hendelse.oppdragType}`,
    hendelse.kundNavn ? `Kunde: ${hendelse.kundNavn}` : null,
    hendelse.kundTelefon ? `Telefon: ${hendelse.kundTelefon}` : null,
    hendelse.beskrivelse ? `\nBeskrivelse: ${hendelse.beskrivelse}` : null,
    `\nPortal: ${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://takstmann.net'}/portal/takstmann/oppdrag/${hendelse.oppdragId}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: hendelse.tittel,
        description: beskrivelse,
        location: lokasjon || undefined,
        start: {
          date: startDato, // Heldagsbegivenhet
          timeZone: 'Europe/Oslo',
        },
        end: {
          date: startDato,
          timeZone: 'Europe/Oslo',
        },
        colorId: '5', // Gul – skiller seg ut i kalenderen
        source: {
          title: 'takstmann.net',
          url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://takstmann.net'}/portal/takstmann/oppdrag/${hendelse.oppdragId}`,
        },
      },
    })

    return data.id ?? null
  } catch (err) {
    console.error('Google Calendar opprettHendelse feil:', err)
    return null
  }
}

/**
 * Oppdaterer en eksisterende kalenderhendelse.
 */
export async function oppdaterKalenderHendelse(
  takstmannId: string,
  googleEventId: string,
  hendelse: Partial<KalenderHendelse>
): Promise<boolean> {
  const auth = await lagAutentisertKlient(takstmannId)
  if (!auth) return false

  const calendar = google.calendar({ version: 'v3', auth })

  try {
    // Hent eksisterende hendelse
    const { data: eksisterende } = await calendar.events.get({
      calendarId: 'primary',
      eventId: googleEventId,
    })

    const oppdatertStart = hendelse.befaringsdato
      ? hendelse.befaringsdato
      : (eksisterende.start?.date ?? eksisterende.start?.dateTime?.split('T')[0])

    const lokasjon = hendelse.adresse || hendelse.by
      ? [hendelse.adresse, hendelse.by].filter(Boolean).join(', ')
      : eksisterende.location

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: {
        summary: hendelse.tittel ?? eksisterende.summary,
        location: lokasjon,
        start: {
          date: oppdatertStart,
          timeZone: 'Europe/Oslo',
        },
        end: {
          date: oppdatertStart,
          timeZone: 'Europe/Oslo',
        },
      },
    })

    return true
  } catch (err) {
    console.error('Google Calendar oppdaterHendelse feil:', err)
    return false
  }
}

/**
 * Sletter en kalenderhendelse.
 */
export async function slettKalenderHendelse(
  takstmannId: string,
  googleEventId: string
): Promise<boolean> {
  const auth = await lagAutentisertKlient(takstmannId)
  if (!auth) return false

  const calendar = google.calendar({ version: 'v3', auth })

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    })
    return true
  } catch (err) {
    console.error('Google Calendar slettHendelse feil:', err)
    return false
  }
}

/**
 * Henter kommende hendelser fra takstmannens kalender (neste 30 dager).
 */
export async function hentKalenderHendelser(takstmannId: string) {
  const auth = await lagAutentisertKlient(takstmannId)
  if (!auth) return []

  const calendar = google.calendar({ version: 'v3', auth })

  const nå = new Date()
  const om30Dager = new Date(nå.getTime() + 30 * 24 * 60 * 60 * 1000)

  try {
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: nå.toISOString(),
      timeMax: om30Dager.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    })

    return data.items ?? []
  } catch (err) {
    console.error('Google Calendar hentHendelser feil:', err)
    return []
  }
}
