import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 })

  // Hent dokumentet og verifiser eierskap
  const { data: dok } = await supabase
    .from('dokumenter')
    .select('id, storage_path, lastet_opp_av')
    .eq('id', id)
    .single()

  if (!dok) return NextResponse.json({ error: 'Dokument ikke funnet' }, { status: 404 })

  if (dok.lastet_opp_av !== user.id) {
    return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 })
  }

  // Slett fra storage
  const { error: storageFeil } = await supabase.storage
    .from('dokumenter')
    .remove([dok.storage_path])

  if (storageFeil) {
    console.error('Storage slett feil:', storageFeil)
  }

  // Slett fra database
  const { error: dbFeil } = await supabase
    .from('dokumenter')
    .delete()
    .eq('id', id)

  if (dbFeil) {
    return NextResponse.json({ error: 'Kunne ikke slette dokumentet' }, { status: 500 })
  }

  return NextResponse.json({ slettet: true })
}
