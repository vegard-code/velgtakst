import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dokumentId = request.nextUrl.searchParams.get('id')
  if (!dokumentId) {
    return NextResponse.json({ error: 'Mangler id' }, { status: 400 })
  }

  // RLS på dokumenter-tabellen sørger for at brukeren kun får treff
  // på dokumenter de faktisk har tilgang til.
  const { data: dok, error: dokError } = await supabase
    .from('dokumenter')
    .select('storage_path')
    .eq('id', dokumentId)
    .maybeSingle()

  if (dokError) {
    console.error('[dokumenter] Feil ved henting i signert-url:', dokError.message)
    return NextResponse.json({ error: 'Feil ved henting av dokument' }, { status: 500 })
  }
  if (!dok) {
    return NextResponse.json({ error: 'Ikke funnet' }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from('dokumenter')
    .createSignedUrl(dok.storage_path, 3600) // 1 time

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Kunne ikke lage signert URL' },
      { status: 500 }
    )
  }

  return NextResponse.json({ url: data.signedUrl })
}