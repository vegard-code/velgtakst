import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/vipps/recurring-webhook
 *
 * Vipps sender webhook-kall når en agreement endrer status
 * (f.eks. PENDING → ACTIVE, eller ACTIVE → STOPPED).
 *
 * Vi oppdaterer abonnement-tabellen tilsvarende.
 */
export async function POST(request: NextRequest) {
  // Fail-closed: reject if secret is not configured or doesn't match
  const webhookSecret = process.env.VIPPS_WEBHOOK_SECRET
  if (!webhookSecret || request.headers.get('Authorization') !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('Vipps recurring webhook:', JSON.stringify(body, null, 2))

    const agreementId = body.agreementId as string | undefined
    const status = body.status as string | undefined

    if (!agreementId || !status) {
      return NextResponse.json({ error: 'Missing agreementId or status' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Finn abonnement basert på vipps_agreement_id
    const { data: abonnement } = await supabase
      .from('abonnementer')
      .select('id, company_id, status')
      .eq('vipps_agreement_id', agreementId)
      .maybeSingle()

    if (!abonnement) {
      console.warn('Webhook: No abonnement found for agreement', agreementId)
      return NextResponse.json({ ok: true }) // Returner 200 uansett for å unngå retries
    }

    // Map Vipps-status til vår status
    let nyStatus: string = abonnement.status
    if (status === 'ACTIVE') {
      nyStatus = 'aktiv'
    } else if (status === 'STOPPED' || status === 'EXPIRED') {
      nyStatus = 'kansellert'
    }

    await supabase
      .from('abonnementer')
      .update({
        vipps_agreement_status: status,
        status: nyStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', abonnement.id)

    console.log(`Abonnement ${abonnement.id} oppdatert: ${abonnement.status} → ${nyStatus}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Vipps recurring webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
