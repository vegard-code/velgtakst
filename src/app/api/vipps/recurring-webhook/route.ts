import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyVippsWebhook } from '@/lib/vipps/webhook-auth'

/**
 * POST /api/vipps/recurring-webhook
 *
 * Vipps sender webhook-kall når en agreement endrer status
 * (f.eks. PENDING → ACTIVE, eller ACTIVE → STOPPED) eller når
 * en charge kaptures/feiler.
 *
 * Requesten verifiseres med HMAC-SHA256 mot VIPPS_RECURRING_WEBHOOK_SECRET
 * (secret'en som ble returnert da webhooken ble registrert hos Vipps).
 *
 * Fail-closed: uten gyldig signatur svarer vi 401 og gjør ingen oppdateringer.
 */
export async function POST(request: NextRequest) {
  // VIPPS_RECURRING_WEBHOOK_SECRET er det foretrukne navnet, men vi faller tilbake
  // på VIPPS_WEBHOOK_SECRET siden den eksisterer fra før og inneholder HMAC-secret'en
  // som Vipps returnerte ved webhook-registrering.
  const secret =
    process.env.VIPPS_RECURRING_WEBHOOK_SECRET ?? process.env.VIPPS_WEBHOOK_SECRET
  if (!secret) {
    console.error('[vipps-recurring-webhook] Hverken VIPPS_RECURRING_WEBHOOK_SECRET eller VIPPS_WEBHOOK_SECRET er satt')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Les rå body – må være den eksakte byte-stringen Vipps signerte
  const rawBody = await request.text()

  // Vipps signerer med host slik klienten sendte den. På Vercel kommer det
  // via host-headeren; x-forwarded-host brukes som fallback i tilfelle proxy-oppsett.
  const host =
    request.headers.get('host') ??
    request.headers.get('x-forwarded-host') ??
    ''

  const url = new URL(request.url)
  const pathAndQuery = url.pathname + (url.search || '')

  const verification = verifyVippsWebhook({
    method: 'POST',
    pathAndQuery,
    host,
    rawBody,
    headers: request.headers,
    secret,
  })

  if (!verification.ok) {
    console.warn(
      '[vipps-recurring-webhook] Avvist ugyldig signatur:',
      verification.reason
    )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body etter at signaturen er verifisert
  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const supabase = await createServiceClient()

    // Vipps webhooks v1 sender event som "eventType" ELLER "name" avhengig av event-familie.
    // For recurring får vi typisk: "recurring.agreement-activated.v1",
    // "recurring.agreement-stopped.v1", "recurring.charge-captured.v1",
    // "recurring.charge-failed.v1" osv.
    const eventType = (body.eventType as string | undefined) ?? (body.name as string | undefined) ?? ''
    const agreementId =
      (body.agreementId as string | undefined) ??
      ((body.data as { agreementId?: string } | undefined)?.agreementId)

    if (!agreementId) {
      console.warn('[vipps-recurring-webhook] Mangler agreementId i event:', eventType)
      return NextResponse.json({ ok: true }) // 200 for å unngå retries
    }

    // Finn abonnement basert på vipps_agreement_id
    const { data: abonnement, error: findError } = await supabase
      .from('abonnementer')
      .select('id, company_id, status')
      .eq('vipps_agreement_id', agreementId)
      .maybeSingle()

    if (findError) {
      console.error('[vipps-recurring-webhook] DB-feil ved oppslag:', findError.message)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    if (!abonnement) {
      console.warn('[vipps-recurring-webhook] Ingen abonnement funnet for', agreementId)
      return NextResponse.json({ ok: true }) // 200 – unngå Vipps-retries for ukjente avtaler
    }

    // Map Vipps-event til vår status
    // Vi aksepterer både det nye event-type-formatet (recurring.*) og
    // det gamle body-formatet (body.status direkte).
    let nyStatus: string = abonnement.status
    let vippsAgreementStatus: string | null = null

    if (eventType.includes('agreement-activated') || body.status === 'ACTIVE') {
      nyStatus = 'aktiv'
      vippsAgreementStatus = 'ACTIVE'
    } else if (
      eventType.includes('agreement-stopped') ||
      eventType.includes('agreement-expired') ||
      body.status === 'STOPPED' ||
      body.status === 'EXPIRED'
    ) {
      nyStatus = 'kansellert'
      vippsAgreementStatus = body.status === 'EXPIRED' ? 'EXPIRED' : 'STOPPED'
    }

    if (vippsAgreementStatus !== null) {
      const { error: updateError } = await supabase
        .from('abonnementer')
        .update({
          vipps_agreement_status: vippsAgreementStatus,
          status: nyStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', abonnement.id)

      if (updateError) {
        console.error('[vipps-recurring-webhook] DB-feil ved oppdatering:', updateError.message)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
    } else {
      // Charge-events (captured/failed/etc) logges foreløpig, håndteres i neste iterasjon
      console.log('[vipps-recurring-webhook] Mottatt event (ikke agreement-status):', eventType, agreementId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[vipps-recurring-webhook] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
