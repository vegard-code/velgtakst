import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { lagAuthUrl } from '@/lib/integrasjoner/outlook-calendar'

/**
 * GET /api/auth/outlook
 *
 * Starter Microsoft OAuth2-flyten for Outlook Calendar-tilgang.
 * Krever at brukeren er logget inn som takstmann.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/logg-inn', request.url))
  }

  // Verifiser at brukeren er takstmann
  const { data: profil } = await supabase
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .single()

  if (!profil || (profil.rolle !== 'takstmann' && profil.rolle !== 'takstmann_admin' && profil.rolle !== 'admin')) {
    return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
  }

  // Generer state for CSRF-beskyttelse
  const state = randomBytes(32).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('outlook_oauth_state', JSON.stringify({ state, userId: user.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutter
    path: '/',
  })

  const authUrl = lagAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
