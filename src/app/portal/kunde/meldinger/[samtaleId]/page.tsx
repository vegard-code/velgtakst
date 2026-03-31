import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hentMeldinger } from '@/lib/actions/meldinger'
import ChatVindu from '@/components/portal/ChatVindu'

interface Props {
  params: Promise<{ samtaleId: string }>
}

export default async function KundeSamtalePage({ params }: Props) {
  const { samtaleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: samtale } = await supabase
    .from('samtaler')
    .select(`
      id, takstmann_id,
      takstmann:takstmann_profiler(navn)
    `)
    .eq('id', samtaleId)
    .single()

  if (!samtale) notFound()

  const takstmann = samtale.takstmann as unknown as { navn: string } | null
  const motpartNavn = takstmann?.navn ?? 'Ukjent'

  const meldinger = await hentMeldinger(samtaleId)

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)]">
      <Link
        href="/portal/kunde/meldinger"
        className="inline-flex items-center gap-1.5 text-[#64748b] hover:text-[#285982] transition-colors text-sm mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Tilbake til meldinger
      </Link>

      <div className="portal-card overflow-hidden h-[calc(100%-3rem)]">
        <ChatVindu
          samtaleId={samtaleId}
          currentUserId={user.id}
          motpartNavn={motpartNavn}
          initielleMeldinger={meldinger}
        />
      </div>
    </div>
  )
}
