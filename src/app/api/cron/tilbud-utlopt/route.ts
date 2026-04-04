import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Cron job: Marker tilbud som utløpt etter 48 timer uten svar.
 * Kjøres av Vercel Cron to ganger daglig.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const fristUtlopt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Finn alle tilbud sendt for mer enn 48 timer siden som fortsatt er tilbud_sendt
  const { data: utlopte, error } = await supabase
    .from('bestillinger')
    .select('id, tilbud_sendt_at')
    .eq('status', 'tilbud_sendt')
    .lt('tilbud_sendt_at', fristUtlopt)

  if (error) {
    console.error('Cron tilbud-utlopt error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!utlopte || utlopte.length === 0) {
    return NextResponse.json({ utlopt: 0 })
  }

  const ids = utlopte.map((b) => b.id)
  const { error: updateError } = await supabase
    .from('bestillinger')
    .update({ status: 'utløpt' })
    .in('id', ids)

  if (updateError) {
    console.error('Cron tilbud-utlopt update error:', updateError)
    return NextResponse.json({ error: 'Update error' }, { status: 500 })
  }

  return NextResponse.json({ utlopt: ids.length })
}
