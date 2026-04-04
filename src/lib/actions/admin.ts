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
    .single()

  if ((profil as { rolle: string } | null)?.rolle !== 'admin') return null
  return user
}

/**
 * Forleng prøveperiode for et abonnement.
 * Hvis status er 'utlopt' eller 'kansellert', settes status tilbake til
 * 'proveperiode' og alle fylke- og kommune-synligheter reaktiveres.
 */
export async function forlengProveperiode(
  abonnementId: string,
  ekstraDager: number
): Promise<{ success?: boolean; error?: string }> {
  const admin = await sjekkAdmin()
  if (!admin) return { error: 'Ikke autorisert' }

  if (!Number.isInteger(ekstraDager) || ekstraDager < 1 || ekstraDager > 3650) {
    return { error: 'Ugyldig antall dager (1–3650)' }
  }

  const supabase = await createServiceClient()

  // Hent abonnementet
  const { data: ab, error: fetchError } = await supabase
    .from('abonnementer')
    .select('id, company_id, status, proveperiode_slutt')
    .eq('id', abonnementId)
    .single()

  if (fetchError || !ab) return { error: 'Abonnement ikke funnet' }

  const now = new Date()
  const tillegg = ekstraDager * 24 * 60 * 60 * 1000
  const reaktiver = ab.status === 'utlopt' || ab.status === 'kansellert'

  // Nytt utløpstidspunkt: forleng fra nåværende slutt hvis aktiv, ellers fra nå
  const gjeldendeSlutt = ab.proveperiode_slutt
    ? new Date(ab.proveperiode_slutt)
    : now
  const base = gjeldendeSlutt > now ? gjeldendeSlutt : now
  const nySluttDato = new Date(base.getTime() + tillegg)

  // Oppdater abonnementet
  const { error: updateError } = await supabase
    .from('abonnementer')
    .update({
      proveperiode_slutt: nySluttDato.toISOString(),
      ...(reaktiver ? { status: 'proveperiode' } : {}),
      updated_at: now.toISOString(),
    })
    .eq('id', abonnementId)

  if (updateError) return { error: updateError.message }

  // Reaktiver fylker og kommuner hvis abonnementet var utløpt/kansellert
  if (reaktiver) {
    const { data: profiler } = await supabase
      .from('takstmann_profiler')
      .select('id')
      .eq('company_id', ab.company_id)

    if (profiler && profiler.length > 0) {
      const takstmannIds = profiler.map((p) => p.id)

      await supabase
        .from('fylke_synlighet')
        .update({
          er_aktiv: true,
          betalt_til: nySluttDato.toISOString(),
        })
        .in('takstmann_id', takstmannIds)

      await supabase
        .from('kommune_synlighet')
        .update({ er_aktiv: true })
        .in('takstmann_id', takstmannIds)
    }
  }

  revalidatePath('/portal/admin/abonnementer')
  revalidatePath('/', 'layout')
  return { success: true }
}
