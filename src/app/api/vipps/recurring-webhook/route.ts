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
      // Bygg oppdateringsobjekt
      const updateData: Record<string, unknown> = {
        vipps_agreement_status: vippsAgreementStatus,
        status: nyStatus,
        updated_at: new Date().toISOString(),
      }

      // KRITISK: Når avtalen aktiveres, sett neste_trekk_dato til i morgen
      // slik at abonnement-trekk-cron fanger den opp ved neste kjøring.
      if (nyStatus === 'aktiv') {
        const iMorgen = new Date()
        iMorgen.setDate(iMorgen.getDate() + 1)
        updateData.neste_trekk_dato = iMorgen.toISOString().split('T')[0]
      }

      const { error: updateError } = await supabase
        .from('abonnementer')
        .update(updateData)
        .eq('id', abonnement.id)

      if (updateError) {
        console.error('[vipps-recurring-webhook] DB-feil ved oppdatering:', updateError.message)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      console.log(`[vipps-recurring-webhook] Abonnement ${abonnement.id}: ${abonnement.status} → ${nyStatus}`)
    } else if (eventType.includes('charge-captured')) {
      // Vellykket belastning — logg for sporbarhet
      const chargeId = (body.data as Record<string, unknown> | undefined)?.chargeId ?? 'ukjent'
      console.log(`[vipps-recurring-webhook] Charge captured for ${agreementId}, chargeId=${chargeId}`)

    } else if (eventType.includes('charge-failed') || eventType.includes('charge-creation-failed')) {
      // Mislykket belastning — logg som error for varsling
      const chargeId = (body.data as Record<string, unknown> | undefined)?.chargeId ?? 'ukjent'
      const failureReason = (body.data as Record<string, unknown> | undefined)?.failureReason ?? 'ukjent'
      console.error(
        `[vipps-recurring-webhook] CHARGE FAILED for ${agreementId}, chargeId=${chargeId}, reason=${failureReason}`
      )

    } else if (eventType.includes('charge-cancelled')) {
      console.log(`[vipps-recurring-webhook] Charge cancelled for ${agreementId}`)

    } else {
      console.log('[vipps-recurring-webhook] Ukjent event:', eventType, agreementId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[vipps-recurring-webhook] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
