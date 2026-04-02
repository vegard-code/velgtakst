import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/slett-konto
 *
 * Sletter den innloggede brukerens konto via Supabase Admin API.
 * CASCADE i databasen tar seg av å slette relaterte data.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Ikke autentisert' }, { status: 401 })
  }

  const adminClient = await createServiceClient()
  const { error } = await adminClient.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Feil ved sletting av konto:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
