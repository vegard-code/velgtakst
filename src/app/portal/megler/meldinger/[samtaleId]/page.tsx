import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hentMeldinger } from '@/lib/actions/meldinger'
import ChatVindu from '@/components/portal/ChatVindu'

interface Props {
  params: Promise<{ samtaleId: string }>
}

export default async function MeglerSamtalePage({ params }: Props) {
  const { samtaleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/logg-inn')

  const serviceSupabase = await createServiceClient()

  const { data: samtale } = await serviceSupabase
    .from('samtaler')
    .select('id, takstmann_id')
    .eq('id', samtaleId)
    .single()

  if (!samtale) notFound()

  // Hent takstmann-navn i separat spørring (PostgREST joins fungerer ikke pålitelig)
  let motpartNavn = 'Ukjent'
  if (samtale.takstmann_id) {
    const { data: tp } = await serviceSupabase
      .from('takstmann_profiler')
      .select('navn')
      .eq('id', samtale.takstmann_id)
      .single()
    if (tp?.navn) motpartNavn = tp.navn
  }

  const meldinger = await hentMeldinger(samtaleId)

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)]">
      <Link
        href="/portal/megler/meldinger"
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
