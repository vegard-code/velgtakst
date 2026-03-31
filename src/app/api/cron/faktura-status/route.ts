import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { synkroniserFakturaStatus } from '@/lib/actions/faktura'

// Kjøres hver time via Vercel Cron
// Konfigurer i vercel.json: { "crons": [{ "path": "/api/cron/faktura-status", "schedule": "0 * * * *" }] }
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: fakturerte } = await supabase
    .from('oppdrag')
    .select('id')
    .eq('status', 'fakturert')
    .not('faktura_id', 'is', null)

  let oppdatert = 0
  for (const oppdrag of (fakturerte ?? []) as { id: string }[]) {
    const resultat = await synkroniserFakturaStatus(oppdrag.id)
    if (resultat.oppdatert) oppdatert++
  }

  return NextResponse.json({ success: true, sjekket: fakturerte?.length ?? 0, oppdatert })
}
