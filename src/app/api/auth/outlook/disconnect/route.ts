import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slettToken } from '@/lib/integrasjoner/outlook-calendar'

/**
 * POST /api/auth/outlook/disconnect
 *
 * Kobler fra Outlook Calendar ved å slette tokens fra Supabase.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 })
  }

  const { data: takstmannProfil } = await supabase
    .from('takstmann_profiler')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!takstmannProfil) {
    return NextResponse.json({ error: 'Takstmann-profil ikke funnet' }, { status: 404 })
  }

  await slettToken(takstmannProfil.id)

  // Redirect tilbake til innstillinger
  const redirectUrl = request.nextUrl.searchParams.get('redirect')
    ?? '/portal/takstmann/innstillinger?fane=integrasjoner&success=outlook_frakoblet'

  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
