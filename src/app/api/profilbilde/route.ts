import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Ingen fil valgt' }, { status: 400 })
  }

  // Valider filtype
  const tillattTyper = ['image/jpeg', 'image/png', 'image/webp']
  if (!tillattTyper.includes(file.type)) {
    return NextResponse.json({ error: 'Kun JPG, PNG og WebP er tillatt' }, { status: 400 })
  }

  // Maks 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Maks filstørrelse er 5MB' }, { status: 400 })
  }

  // Hent takstmann-profil
  const { data: takstmann, error: takstmannError } = await supabase
    .from('takstmann_profiler')
    .select('id, bilde_url')
    .eq('user_id', user.id)
    .maybeSingle()

  if (takstmannError) {
    console.error('[takstmann_profiler] Feil ved henting av profil i profilbilde:', takstmannError.message)
    return NextResponse.json({ error: 'Feil ved henting av profil' }, { status: 500 })
  }
  if (!takstmann) {
    return NextResponse.json({ error: 'Fant ikke takstmann-profil' }, { status: 404 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filnavn = `${takstmann.id}.${ext}`

  // Last opp til Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('profilbilder')
    .upload(filnavn, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Kunne ikke laste opp bildet' }, { status: 500 })
  }

  // Hent public URL
  const { data: publicUrl } = supabase.storage
    .from('profilbilder')
    .getPublicUrl(filnavn)

  // Oppdater takstmann-profil med bilde-URL
  const { error: updateError } = await supabase
    .from('takstmann_profiler')
    .update({
      bilde_url: publicUrl.publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', takstmann.id)

  if (updateError) {
    console.error('Update profil error:', updateError)
    return NextResponse.json({ error: 'Bildet ble lastet opp, men profilen ble ikke oppdatert' }, { status: 500 })
  }

  return NextResponse.json({ success: true, bildeUrl: publicUrl.publicUrl })
}
