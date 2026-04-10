/**
 * Admin-verktøy for å administrere Vipps webhook-registreringer.
 *
 * GET    /api/admin/vipps/webhooks   → list alle registrerte webhooks
 * POST   /api/admin/vipps/webhooks   → registrer recurring-webhook (returnerer secret ÉN gang)
 * DELETE /api/admin/vipps/webhooks?id=<id> → slett en registrert webhook
 *
 * Alle endepunkt krever at kallende bruker har rolle 'admin' i user_profiles.
 *
 * Dette er en engangsoperasjon: etter vellykket POST må den returnerte
 * `secret` kopieres inn i Vercel som VIPPS_RECURRING_WEBHOOK_SECRET og
 * deretter re-deployes prosjektet.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  listVippsWebhooks,
  opprettVippsWebhook,
  slettVippsWebhook,
  RECURRING_WEBHOOK_EVENTS,
} from '@/lib/vipps/webhooks-api'

async function krevAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }

  const { data: profil } = await supabase
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .maybeSingle()

  if ((profil as { rolle: string } | null)?.rolle !== 'admin') {
    return { error: 'Forbudt', status: 403 as const }
  }
  return { user }
}

export async function GET() {
  const adminCheck = await krevAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  try {
    const webhooks = await listVippsWebhooks()
    return NextResponse.json({ webhooks })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ukjent feil'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST() {
  const adminCheck = await krevAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_SITE_URL mangler i miljøvariabler' },
      { status: 500 }
    )
  }

  const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/vipps/recurring-webhook`

  try {
    // Sjekk om det allerede finnes en webhook mot denne URL-en for å unngå duplikater
    const eksisterende = await listVippsWebhooks()
    const duplikat = eksisterende.find((w) => w.url === webhookUrl)
    if (duplikat) {
      return NextResponse.json(
        {
          error:
            'En webhook med samme URL finnes allerede. Slett den først hvis du vil registrere på nytt.',
          eksisterende: duplikat,
        },
        { status: 409 }
      )
    }

    const resultat = await opprettVippsWebhook({
      url: webhookUrl,
      events: RECURRING_WEBHOOK_EVENTS,
    })

    return NextResponse.json({
      melding:
        'Webhook registrert. Kopier `secret` inn i Vercel som VIPPS_RECURRING_WEBHOOK_SECRET og re-deploy. Secret-en vises KUN nå – ta vare på den.',
      id: resultat.id,
      url: resultat.url,
      events: resultat.events,
      secret: resultat.secret,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ukjent feil'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await krevAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Mangler id' }, { status: 400 })
  }

  try {
    await slettVippsWebhook(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ukjent feil'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
