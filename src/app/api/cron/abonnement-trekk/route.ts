import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { opprettCharge } from '@/lib/vipps/recurring'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Cron job: Daglig trekk av månedlige abonnementer.
 * Finner alle aktive abonnementer med neste_trekk_dato <= i dag og oppretter charges.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Vipps krever minimum 2 dager frem i tid for due date
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 2)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  const { data: abonnementer } = await supabase
    .from('abonnementer')
    .select('id, vipps_agreement_id, maanedlig_belop, neste_trekk_dato')
    .eq('status', 'aktiv')
    .lte('neste_trekk_dato', today)
    .not('vipps_agreement_id', 'is', null)

  if (!abonnementer || abonnementer.length === 0) {
    return NextResponse.json({ behandlet: 0, feil: 0 })
  }

  let behandlet = 0
  let feil = 0
  const feilDetaljer: string[] = []

  for (const ab of abonnementer) {
    try {
      await opprettCharge({
        agreementId: ab.vipps_agreement_id,
        amountOre: ab.maanedlig_belop,
        description: 'Månedlig abonnement – takstmann.net',
        dueDate: dueDateStr,
      })

      // Oppdater neste_trekk_dato til +1 måned
      const neste = new Date(today)
      neste.setMonth(neste.getMonth() + 1)
      const nesteDato = neste.toISOString().split('T')[0]

      await supabase
        .from('abonnementer')
        .update({
          neste_trekk_dato: nesteDato,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ab.id)

      behandlet++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Feil ved charge for abonnement ${ab.id}:`, msg)
      feilDetaljer.push(`${ab.id}: ${msg}`)
      feil++
    }
  }

  const status = feil > 0 ? 207 : 200
  return NextResponse.json({ behandlet, feil, feilDetaljer }, { status })
}
