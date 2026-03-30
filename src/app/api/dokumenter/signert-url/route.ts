import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storagePath = request.nextUrl.searchParams.get('path')
  if (!storagePath) return NextResponse.json({ error: 'Mangler path' }, { status: 400 })

  const { data, error } = await supabase.storage
    .from('dokumenter')
    .createSignedUrl(storagePath, 3600) // 1 time

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Kunne ikke lage signert URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
