import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { synkroniserFakturaStatus } from '@/lib/actions/faktura'

// Kjøres hver time via Vercel Cron
// Konfigurer i vercel.json: { "crons": [{ "path": "/api/cron/faktura-status", "schedule": "0 * * * *" }] }
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: fakturerte } = await supabase
    .from('oppdrag')
    .select('id')
    .eq('status', 'fakturert')
    .not('faktura_id', 'is', null)

  const alle = (fakturerte ?? []) as { id: string }[]
  const BATCH_STORRELSE = 5
  let oppdatert = 0

  for (let i = 0; i < alle.length; i += BATCH_STORRELSE) {
    const batch = alle.slice(i, i + BATCH_STORRELSE)
    const resultater = await Promise.all(batch.map((o) => synkroniserFakturaStatus(o.id)))
    oppdatert += resultater.filter((r) => r.oppdatert).length
  }

  return NextResponse.json({ success: true, sjekket: alle.length, oppdatert })
}
