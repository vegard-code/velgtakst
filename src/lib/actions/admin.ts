'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function sjekkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profil } = await supabase
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .maybeSingle()

  if ((profil as { rolle: string } | null)?.rolle !== 'admin') return null
  return user
}

/**
 * Forleng prøveperiode for en takstmann.
 * Oppdaterer proveperiode_slutt i abonnementer (fra maks av nå og nåværende slutt).
 * Reaktiverer status og fylke-/kommunesynlighet hvis abonnementet er utløpt eller kansellert.
 */
export async function forlengProveperiode(
  takstmannId: string,
  antallDager: number
): Promise<{ success?: boolean; error?: string; nySluttDato?: string }> {
  const admin = await sjekkAdmin()
  if (!admin) return { error: 'Ikke autorisert' }

  if (!takstmannId) return { error: 'Mangler takstmannId' }
  if (!Number.isInteger(antallDager) || antallDager < 1 || antallDager > 3650) {
    return { error: 'Ugyldig antall dager (1–3650)' }
  }

  const supabase = await createServiceClient()

  // Hent company_id via takstmann_profiler
  const { data: takstmann, error: takstmannError } = await supabase
    .from('takstmann_profiler')
    .select('id, company_id')
    .eq('id', takstmannId)
    .maybeSingle()

  if (takstmannError || !takstmann?.company_id) {
    return { error: 'Fant ikke takstmann' }
  }

  // Hent nåværende abonnement
  const { data: ab, error: abError } = await supabase
    .from('abonnementer')
    .select('id, status, proveperiode_slutt')
    .eq('company_id', takstmann.company_id)
    .maybeSingle()

  if (abError || !ab) {
    return { error: 'Fant ikke abonnement' }
  }

  const now = new Date()
  const reaktiver = ab.status === 'utlopt' || ab.status === 'kansellert'

  // Beregn ny slutt: maks av nå og nåværende slutt, pluss antallDager
  const gjeldendeSlutt = ab.proveperiode_slutt ? new Date(ab.proveperiode_slutt) : now
  const base = gjeldendeSlutt > now ? gjeldendeSlutt : now
  const nySluttDato = new Date(base.getTime() + antallDager * 24 * 60 * 60 * 1000)

  // Oppdater abonnement
  const { error: updateError } = await supabase
    .from('abonnementer')
    .update({
      proveperiode_slutt: nySluttDato.toISOString(),
      ...(reaktiver ? { status: 'proveperiode' } : {}),
      updated_at: now.toISOString(),
    })
    .eq('id', ab.id)

  if (updateError) return { error: updateError.message }

  // Reaktiver fylker og kommuner hvis abonnementet var utløpt/kansellert
  if (reaktiver) {
    await supabase
      .from('fylke_synlighet')
      .update({ er_aktiv: true, betalt_til: nySluttDato.toISOString() })
      .eq('takstmann_id', takstmannId)

    await supabase
      .from('kommune_synlighet')
      .update({ er_aktiv: true })
      .eq('takstmann_id', takstmannId)
  }

  // Logg hendelsen (best effort – ikke blokkér ved feil)
  void supabase
    .from('admin_hendelse_logg')
    .insert({
      admin_user_id: admin.id,
      hendelse_type: 'forleng_proveperiode',
      target_id: takstmannId,
      target_type: 'takstmann',
      detaljer: {
        antall_dager: antallDager,
        gammel_slutt: ab.proveperiode_slutt,
        ny_slutt: nySluttDato.toISOString(),
        reaktivert: reaktiver,
      },
    })

  revalidatePath(`/portal/admin/takstmenn/${takstmannId}`)
  revalidatePath('/portal/admin/takstmenn')
  revalidatePath('/portal/admin/abonnementer')
  revalidatePath('/', 'layout')

  return { success: true, nySluttDato: nySluttDato.toISOString() }
}
