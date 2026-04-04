import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? 'noreply@takstmann.net'
const RESEND_URL = 'https://api.resend.com/emails'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return
  await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
}

function emailHtml(navn: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #285982; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">takstmann.net – Prøveperiode</h1>
      </div>
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
        <p>Hei ${navn},</p>
        ${body}
        <a href="${APP_URL}/portal/takstmann/abonnement"
           style="display: inline-block; background: #285982; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          Administrer abonnement
        </a>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">takstmann.net</p>
      </div>
    </div>
  `
}

/**
 * Cron job: Daglig sjekk av utløpende og utløpte prøveperioder.
 * - Abonnementer som utløper om 7 dager → varsel-e-post
 * - Abonnementer som har utløpt → sett status='utlopt', deaktiver fylker, send e-post
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const now = new Date()

  // --- 1. Håndter utløpte prøveperioder ---
  const { data: utlopte } = await supabase
    .from('abonnementer')
    .select('id, company_id, proveperiode_slutt')
    .eq('status', 'proveperiode')
    .lt('proveperiode_slutt', now.toISOString())

  let utloptAntall = 0
  let utloptVarsler = 0

  if (utlopte && utlopte.length > 0) {
    const ids = utlopte.map((a) => a.id)
    const companyIds = utlopte.map((a) => a.company_id)

    // Sett status = 'utlopt'
    await supabase
      .from('abonnementer')
      .update({ status: 'utlopt', updated_at: now.toISOString() })
      .in('id', ids)

    // Deaktiver alle fylker for disse bedriftene
    const { data: profiler } = await supabase
      .from('takstmann_profiler')
      .select('id, company_id')
      .in('company_id', companyIds)

    if (profiler && profiler.length > 0) {
      const takstmannIds = profiler.map((p) => p.id)
      await supabase
        .from('fylke_synlighet')
        .update({ er_aktiv: false })
        .in('takstmann_id', takstmannIds)
      await supabase
        .from('kommune_synlighet')
        .update({ er_aktiv: false })
        .in('takstmann_id', takstmannIds)
    }

    utloptAntall = utlopte.length

    // Send utløpt-e-post til takstmenn
    if (RESEND_API_KEY && profiler) {
      for (const ab of utlopte) {
        const profil = profiler.find((p) => p.company_id === ab.company_id) as
          | { id: string; company_id: string; navn?: string; epost?: string }
          | undefined
        const { data: fullProfil } = await supabase
          .from('takstmann_profiler')
          .select('navn, epost')
          .eq('id', profil?.id ?? '')
          .single()
        if (!fullProfil || !(fullProfil as { epost?: string }).epost) continue
        const fp = fullProfil as { navn: string; epost: string }
        try {
          await sendEmail(
            fp.epost,
            'Prøveperioden din på takstmann.net har utløpt',
            emailHtml(
              fp.navn,
              `<p>Prøveperioden din har nå utløpt og profilen din er ikke lenger synlig i søkeresultatene.</p>
               <p>Start et betalt abonnement via Vipps for å bli synlig igjen og nå kunder i ditt område.</p>`
            )
          )
          utloptVarsler++
        } catch (err) {
          console.error('Feil ved sending av utløpt-varsel:', err)
        }
      }
    }
  }

  // --- 2. Send varsel 7 dager før utløp ---
  const syv = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const vinduStart = new Date(syv.getTime() - 13 * 60 * 60 * 1000).toISOString()
  const vinduSlutt = new Date(syv.getTime() + 13 * 60 * 60 * 1000).toISOString()

  const { data: snartUtlopte } = await supabase
    .from('abonnementer')
    .select('id, company_id, proveperiode_slutt')
    .eq('status', 'proveperiode')
    .gte('proveperiode_slutt', vinduStart)
    .lte('proveperiode_slutt', vinduSlutt)

  let syv_dager_varsler = 0

  if (RESEND_API_KEY && snartUtlopte && snartUtlopte.length > 0) {
    const companyIds = snartUtlopte.map((a) => a.company_id)
    const { data: profiler } = await supabase
      .from('takstmann_profiler')
      .select('id, company_id, navn, epost')
      .in('company_id', companyIds)

    for (const ab of snartUtlopte) {
      const profil = (profiler ?? []).find((p) => p.company_id === ab.company_id) as
        | { navn: string; epost: string | null }
        | undefined
      if (!profil?.epost) continue
      const utlopDato = new Date(ab.proveperiode_slutt).toLocaleDateString('nb-NO')
      try {
        await sendEmail(
          profil.epost,
          'Prøveperioden din utløper om 7 dager – takstmann.net',
          emailHtml(
            profil.navn,
            `<p>Prøveperioden din utløper <strong>${utlopDato}</strong> – om 7 dager.</p>
             <p>For å fortsette å være synlig for kunder må du starte et betalt abonnement via Vipps.</p>`
          )
        )
        syv_dager_varsler++
      } catch (err) {
        console.error('Feil ved sending av 7-dagers-varsel:', err)
      }
    }
  }

  return NextResponse.json({
    utlopt: utloptAntall,
    utlopt_varsler: utloptVarsler,
    syv_dager_varsler,
  })
}
