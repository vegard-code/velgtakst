import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { captureVippsBetaling } from '@/lib/vipps/payment'

/**
 * POST /api/vipps/webhook
 *
 * Vipps sender webhooks når betalingsstatus endres.
 * Viktige events:
 *   - AUTHORIZED → kunden har godkjent, vi kan capture
 *   - CAPTURED → betalingen er gjennomført
 *   - CANCELLED → kunden eller vi kansellerte
 *   - FAILED → noe gikk galt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Vipps webhook payload
    const reference = body.reference as string
    const pspReference = body.pspReference as string
    const state = body.name as string // Event name: AUTHORIZED, CAPTURED, etc.

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    console.log(`Vipps webhook: ${state} for ${reference}`)

    // Hent oppdrag-ID fra referanse (format: "oppdrag-{uuid}")
    const oppdragId = reference.replace('oppdrag-', '')

    const supabase = await createServiceClient()

    // Hent oppdrag
    const { data: oppdrag } = await supabase
      .from('oppdrag')
      .select('id, totalbelop, status')
      .eq('id', oppdragId)
      .single()

    if (!oppdrag) {
      console.warn('Vipps webhook: Oppdrag not found for reference:', reference)
      return NextResponse.json({ ok: true }) // Returner 200 uansett så Vipps ikke prøver på nytt
    }

    switch (state) {
      case 'AUTHORIZED': {
        // Kunden har godkjent – auto-capture betalingen
        if (oppdrag.totalbelop && oppdrag.totalbelop > 0) {
          try {
            await captureVippsBetaling(reference, Math.round(oppdrag.totalbelop * 100))
            console.log(`Vipps: Auto-captured ${oppdrag.totalbelop} kr for oppdrag ${oppdragId}`)
          } catch (captureErr) {
            console.error('Vipps auto-capture failed:', captureErr)
          }
        }

        await supabase.from('status_logg').insert({
          oppdrag_id: oppdragId,
          status: 'vipps_godkjent',
          kommentar: `Kunden godkjente Vipps-betaling. PSP ref: ${pspReference}`,
        })
        break
      }

      case 'CAPTURED': {
        // Betaling gjennomført
        await supabase
          .from('oppdrag')
          .update({
            status: 'betalt',
            betalt_dato: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', oppdragId)

        await supabase.from('status_logg').insert({
          oppdrag_id: oppdragId,
          status: 'betalt',
          kommentar: `Vipps-betaling fullført: ${oppdrag.totalbelop} kr`,
        })
        break
      }

      case 'CANCELLED': {
        await supabase.from('status_logg').insert({
          oppdrag_id: oppdragId,
          status: 'vipps_kansellert',
          kommentar: 'Vipps-betaling ble kansellert',
        })
        break
      }

      case 'FAILED': {
        await supabase.from('status_logg').insert({
          oppdrag_id: oppdragId,
          status: 'vipps_feilet',
          kommentar: 'Vipps-betaling feilet',
        })
        break
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Vipps webhook error:', err)
    return NextResponse.json({ ok: true }) // Returner 200 for å unngå retry-storm
  }
}
