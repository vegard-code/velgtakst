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
      .select('id, company_id, status, proveperiode_slutt')
      .eq('vipps_agreement_id', agreementId)
      .maybeSingle()

    if (!abonnement) {
      console.warn('Webhook: No abonnement found for agreement', agreementId)
      return NextResponse.json({ ok: true }) // Returner 200 uansett for å unngå retries
    }

    // Map Vipps-status til vår status
    let nyStatus: string = abonnement.status
    const now = new Date()
    const oppdatering: Record<string, unknown> = {
      vipps_agreement_status: status,
      updated_at: now.toISOString(),
    }

    if (status === 'ACTIVE') {
      nyStatus = 'aktiv'
      // Sett neste_trekk_dato til prøveperiode_slutt hvis i prøveperiode, ellers +1 måned
      let nesteTrekk: Date
      if (abonnement.proveperiode_slutt && new Date(abonnement.proveperiode_slutt) > now) {
        nesteTrekk = new Date(abonnement.proveperiode_slutt)
      } else {
        nesteTrekk = new Date(now)
        nesteTrekk.setMonth(nesteTrekk.getMonth() + 1)
      }
      oppdatering.neste_trekk_dato = nesteTrekk.toISOString().split('T')[0]
    } else if (status === 'STOPPED' || status === 'EXPIRED') {
      nyStatus = 'kansellert'
    }

    oppdatering.status = nyStatus

    await supabase
      .from('abonnementer')
      .update(oppdatering)
      .eq('id', abonnement.id)

    console.log(`Abonnement ${abonnement.id} oppdatert: ${abonnement.status} → ${nyStatus}`)

    // Deaktiver fylker ved kansellering/utløp
    if (status === 'STOPPED' || status === 'EXPIRED') {
      const { data: profiler } = await supabase
        .from('takstmann_profiler')
        .select('id')
        .eq('company_id', abonnement.company_id)

      if (profiler && profiler.length > 0) {
        const takstmannIds = profiler.map((p: { id: string }) => p.id)
        await supabase
          .from('fylke_synlighet')
          .update({ er_aktiv: false })
          .in('takstmann_id', takstmannIds)
        console.log(`Deaktivert fylker for company ${abonnement.company_id}`)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Vipps recurring webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
