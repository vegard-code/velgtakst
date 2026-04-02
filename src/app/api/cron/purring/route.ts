import { NextResponse } from 'next/server'
import { kjorAutomatiskPurring } from '@/lib/actions/purring'

// Kjøres daglig via Vercel Cron
// Konfigurer i vercel.json: { "crons": [{ "path": "/api/cron/purring", "schedule": "0 8 * * *" }] }
export async function GET(request: Request) {
  // Sikkerhet: verifiser cron-secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resultat = await kjorAutomatiskPurring()
    return NextResponse.json({ success: true, ...resultat })
  } catch (err) {
    const melding = err instanceof Error ? err.message : 'Ukjent feil'
    console.error('[Cron Purring] Feil:', melding)
    return NextResponse.json({ error: melding }, { status: 500 })
  }
}
