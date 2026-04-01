import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RAPPORT_TYPER } from '@/lib/supabase/types'
import type { DokumentType } from '@/lib/supabase/types'
import { sendRapportKlarVarsel } from '@/lib/integrasjoner/epost'

const TILLATTE_TYPER = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

const MAKS_STORRELSE = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 })

  const formData = await req.formData()
  const fil = formData.get('fil') as File | null
  const oppdragId = formData.get('oppdrag_id') as string | null
  const dokumentType = (formData.get('dokument_type') as DokumentType | null) ?? 'annet'

  if (!fil) return NextResponse.json({ error: 'Ingen fil valgt' }, { status: 400 })
  if (!oppdragId) return NextResponse.json({ error: 'Mangler oppdrag_id' }, { status: 400 })

  if (!TILLATTE_TYPER.includes(fil.type)) {
    return NextResponse.json({ error: 'Kun PDF og bilder (JPG, PNG, WebP, HEIC) er tillatt' }, { status: 400 })
  }

  if (fil.size > MAKS_STORRELSE) {
    return NextResponse.json({ error: 'Maks filstørrelse er 50 MB' }, { status: 400 })
  }

  // Verifiser at brukeren har tilgang til oppdraget
  const { data: oppdrag } = await supabase
    .from('oppdrag')
    .select(`
      id, tittel,
      megler:megler_profiler(navn, epost),
      privatkunde:privatkunde_profiler(navn, epost),
      takstmann:takstmann_profiler(navn)
    `)
    .eq('id', oppdragId)
    .single()

  if (!oppdrag) {
    return NextResponse.json({ error: 'Oppdrag ikke funnet eller ingen tilgang' }, { status: 404 })
  }

  // Bygg unik storage-sti
  const uuid = crypto.randomUUID()
  const sanitertNavn = fil.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storageSti = `${oppdragId}/${uuid}-${sanitertNavn}`

  const { error: uploadFeil } = await supabase.storage
    .from('dokumenter')
    .upload(storageSti, fil, { cacheControl: '3600', upsert: false })

  if (uploadFeil) {
    console.error('Storage upload feil:', uploadFeil)
    return NextResponse.json({ error: 'Kunne ikke laste opp filen' }, { status: 500 })
  }

  const erRapport = RAPPORT_TYPER.includes(dokumentType)

  const { data: dok, error: dbFeil } = await supabase
    .from('dokumenter')
    .insert({
      oppdrag_id: oppdragId,
      navn: fil.name,
      filtype: fil.type,
      storage_path: storageSti,
      lastet_opp_av: user.id,
      er_rapport: erRapport,
      dokument_type: dokumentType,
      storrelse: fil.size,
    })
    .select()
    .single()

  if (dbFeil || !dok) {
    // Rydd opp storage ved DB-feil
    await supabase.storage.from('dokumenter').remove([storageSti])
    return NextResponse.json({ error: 'Kunne ikke lagre dokumentreferansen' }, { status: 500 })
  }

  // Send "rapport klar"-varsel hvis dokumentet er en rapport
  if (erRapport) {
    const mottaker = (oppdrag.megler as { navn: string; epost: string | null } | null)
      ?? (oppdrag.privatkunde as { navn: string; epost: string | null } | null)
    if (mottaker?.epost) {
      try {
        await sendRapportKlarVarsel({
          til: mottaker.epost,
          mottakerNavn: mottaker.navn,
          oppdragTittel: oppdrag.tittel,
          dokumentNavn: fil.name,
          dokumentType: dokumentType,
        })
      } catch (e) {
        console.error('sendRapportKlarVarsel feil:', e)
      }
    }
  }

  return NextResponse.json({ dokument: dok })
}
