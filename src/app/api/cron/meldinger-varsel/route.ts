import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? 'noreply@velgtakst.no'
const RESEND_URL = 'https://api.resend.com/emails'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://takstmann.net'

// Supabase admin client (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Cron job: Send email notifications for unread messages older than 30 minutes.
 * Should be called by Vercel Cron every 10-15 minutes.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const supabase = getAdminClient()
  const tredveMinSiden = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  // Finn uleste meldinger eldre enn 30 min
  const { data: ulesteMeldinger, error } = await supabase
    .from('meldinger')
    .select(`
      id, samtale_id, avsender_id, innhold, created_at,
      samtale:samtaler(
        takstmann_id, kunde_id, megler_id,
        takstmann:takstmann_profiler(user_id, navn, epost),
        kunde:privatkunde_profiler(user_id, navn, epost),
        megler:megler_profiler(user_id, navn, epost)
      )
    `)
    .eq('lest', false)
    .is('lest_tidspunkt', null)
    .lt('created_at', tredveMinSiden)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Cron meldinger-varsel error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!ulesteMeldinger || ulesteMeldinger.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Group by mottaker (the person who hasn't read)
  const varslerPerMottaker = new Map<string, {
    epost: string
    navn: string
    antall: number
    userId: string
  }>()

  for (const m of ulesteMeldinger) {
    const samtale = m.samtale as unknown as {
      takstmann_id: string
      kunde_id: string | null
      megler_id: string | null
      takstmann: { user_id: string; navn: string; epost: string | null } | null
      kunde: { user_id: string; navn: string; epost: string | null } | null
      megler: { user_id: string; navn: string; epost: string | null } | null
    }
    if (!samtale) continue

    // Determine mottaker(e) — everyone except avsender
    const participants: { userId: string; epost: string | null; navn: string }[] = []

    if (samtale.takstmann?.user_id && samtale.takstmann.user_id !== m.avsender_id) {
      participants.push({
        userId: samtale.takstmann.user_id,
        epost: samtale.takstmann.epost,
        navn: samtale.takstmann.navn,
      })
    }
    if (samtale.kunde?.user_id && samtale.kunde.user_id !== m.avsender_id) {
      participants.push({
        userId: samtale.kunde.user_id,
        epost: samtale.kunde.epost,
        navn: samtale.kunde.navn,
      })
    }
    if (samtale.megler?.user_id && samtale.megler.user_id !== m.avsender_id) {
      participants.push({
        userId: samtale.megler.user_id,
        epost: samtale.megler.epost,
        navn: samtale.megler.navn,
      })
    }

    for (const p of participants) {
      if (!p.epost) continue
      const existing = varslerPerMottaker.get(p.userId)
      if (existing) {
        existing.antall++
      } else {
        varslerPerMottaker.set(p.userId, {
          epost: p.epost,
          navn: p.navn,
          antall: 1,
          userId: p.userId,
        })
      }
    }
  }

  // Check varsel_innstillinger and send
  let sent = 0
  for (const [userId, info] of varslerPerMottaker) {
    // Check if user has opted out
    const { data: innstilling } = await supabase
      .from('varsel_innstillinger')
      .select('epost_meldinger')
      .eq('user_id', userId)
      .maybeSingle()

    if (innstilling && !innstilling.epost_meldinger) continue

    // Check that we haven't already sent a notification recently (use a simple approach:
    // we only send if the oldest unread message is ~30 min old, and we mark by updating
    // a fictional "varsel_sendt" — for simplicity, we'll just send and rely on cron interval)

    try {
      await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [info.epost],
          subject: `Du har ${info.antall} ulest${info.antall === 1 ? '' : 'e'} melding${info.antall === 1 ? '' : 'er'} på VelgTakst`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #285982; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">VelgTakst – Nye meldinger</h1>
              </div>
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
                <p>Hei ${info.navn},</p>
                <p>Du har <strong>${info.antall} ulest${info.antall === 1 ? '' : 'e'} melding${info.antall === 1 ? '' : 'er'}</strong> som venter på svar.</p>
                <a href="${APP_URL}/portal"
                   style="display: inline-block; background: #285982; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
                  Se meldinger
                </a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">
                  Du kan slå av e-postvarsler under Meldinger i portalen.
                </p>
              </div>
            </div>
          `,
        }),
      })
      sent++
    } catch (err) {
      console.error(`Failed to send notification to ${info.epost}:`, err)
    }
  }

  // After sending, mark these messages so we don't re-notify.
  // We do this by setting lest_tidspunkt to a sentinel value indicating "notified"
  // Actually, better: just mark them as lest=false still, but the cron
  // will only pick up messages older than 30 min — if cron runs every 15 min,
  // we might re-send. Let's add a notified_at to avoid that.
  // For simplicity, we'll mark with lest_tidspunkt as sentinel (without marking lest=true).
  // Actually the simplest approach: we only select messages where lest_tidspunkt IS NULL
  // and after notifying we set lest_tidspunkt to now() but keep lest=false.

  const idsToMark = ulesteMeldinger.map((m) => m.id)
  if (idsToMark.length > 0) {
    await supabase
      .from('meldinger')
      .update({ lest_tidspunkt: new Date().toISOString() })
      .in('id', idsToMark)
      .eq('lest', false)
  }

  return NextResponse.json({ sent, total_unread: ulesteMeldinger.length })
}
