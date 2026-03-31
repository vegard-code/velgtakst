import { createClient } from '@/lib/supabase/server'
import { hentSamtaler, hentVarselInnstillinger } from '@/lib/actions/meldinger'
import SamtaleListe from '@/components/portal/SamtaleListe'
import VarselToggle from '@/components/portal/VarselToggle'

export default async function TakstmannMeldingerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const samtaler = await hentSamtaler()
  const varsel = await hentVarselInnstillinger()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1e293b]">Meldinger</h1>
      </div>

      <div className="mb-4">
        <VarselToggle initialVerdi={varsel?.epost_meldinger ?? true} />
      </div>

      <div className="portal-card overflow-hidden">
        <SamtaleListe
          samtaler={samtaler}
          currentUserId={user.id}
          basePath="/portal/takstmann/meldinger"
          rolle="takstmann"
        />
      </div>
    </div>
  )
}
