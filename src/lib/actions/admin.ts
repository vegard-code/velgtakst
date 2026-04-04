'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Forleng prøveperiode for en takstmann.
 * Oppdaterer proveperiode_slutt i abonnementer (fra maks av nå og nåværende slutt).
 * Reaktiverer status og fylkesynlighet hvis abonnementet er utløpt.
 */
export async function forlengProveperiode(takstmannId: string, antallDager: number) {
  if (!takstmannId) return { error: 'Mangler takstmannId' }
  if (!Number.isInteger(antallDager) || antallDager < 1 || antallDager > 365) {
    return { error: 'Antall dager må være mellom 1 og 365' }
  }

  const supabase = await createServiceClient()

  // Hent company_id via takstmann_profiler
  const { data: takstmann, error: takstmannError } = await supabase
    .from('takstmann_profiler')
    .select('id, company_id')
    .eq('id', takstmannId)
    .single()

  if (takstmannError || !takstmann?.company_id) {
    return { error: 'Fant ikke takstmann' }
  }

  // Hent nåværende abonnement
  const { data: abonnement, error: abError } = await supabase
    .from('abonnementer')
    .select('status, proveperiode_slutt')
    .eq('company_id', takstmann.company_id)
    .single()

  if (abError || !abonnement) {
    return { error: 'Fant ikke abonnement' }
  }

  // Beregn ny slutt: maks av nå og nåværende slutt, pluss antallDager
  const now = new Date()
  const currentEnd = new Date(abonnement.proveperiode_slutt)
  const base = currentEnd > now ? currentEnd : now
  base.setDate(base.getDate() + antallDager)
  const nySluttDato = base.toISOString()

  const wasUtlopt = abonnement.status === 'utlopt'

  // Oppdater abonnement
  const { error: updateError } = await supabase
    .from('abonnementer')
    .update({
      proveperiode_slutt: nySluttDato,
      status: wasUtlopt ? 'proveperiode' : abonnement.status,
      updated_at: now.toISOString(),
    })
    .eq('company_id', takstmann.company_id)

  if (updateError) {
    return { error: 'Kunne ikke oppdatere abonnement' }
  }

  // Reaktiver fylkesynlighet hvis abonnementet var utløpt
  if (wasUtlopt) {
    await supabase
      .from('fylke_synlighet')
      .update({ er_aktiv: true })
      .eq('takstmann_id', takstmannId)
  }

  revalidatePath(`/portal/admin/takstmenn/${takstmannId}`)
  revalidatePath('/portal/admin/takstmenn')
  revalidatePath('/portal/admin/abonnementer')

  return { success: true, nySluttDato }
}
