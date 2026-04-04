'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Forleng prøveperioden til en takstmann med X dager.
 * Hvis status er 'utlopt', settes den tilbake til 'proveperiode' og fylke_synlighet reaktiveres.
 */
export async function forlengProveperiode(takstmannId: string, ekstraDager: number) {
  if (!takstmannId || ekstraDager < 1 || ekstraDager > 365) {
    return { error: 'Ugyldig inndata' }
  }

  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  // Verifiser at innlogget bruker er admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke innlogget' }

  const { data: profil } = await supabase
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .single()

  if (!profil || profil.rolle !== 'admin') {
    return { error: 'Ikke tilgang' }
  }

  // Hent takstmann og tilhørende company_id
  const { data: takstmann } = await serviceClient
    .from('takstmann_profiler')
    .select('id, navn, company_id')
    .eq('id', takstmannId)
    .single()

  if (!takstmann?.company_id) {
    return { error: 'Fant ikke takstmann eller company_id' }
  }

  // Hent nåværende abonnement
  const { data: abonnement } = await serviceClient
    .from('abonnementer')
    .select('id, status, proveperiode_slutt')
    .eq('company_id', takstmann.company_id)
    .single()

  if (!abonnement) {
    return { error: 'Fant ikke abonnement' }
  }

  // Regn ut ny sluttdato: forleng fra nåværende slutt eller fra i dag hvis allerede utløpt
  const now = new Date()
  const gammelSlutt = abonnement.proveperiode_slutt
    ? new Date(abonnement.proveperiode_slutt)
    : now
  const basisdato = gammelSlutt < now ? now : gammelSlutt
  const nySlutt = new Date(basisdato.getTime() + ekstraDager * 24 * 60 * 60 * 1000)

  const updates: Record<string, unknown> = {
    proveperiode_slutt: nySlutt.toISOString(),
    updated_at: now.toISOString(),
  }

  const varUtlopt = abonnement.status === 'utlopt'
  if (varUtlopt) {
    updates.status = 'proveperiode'
  }

  const { error: updateError } = await serviceClient
    .from('abonnementer')
    .update(updates)
    .eq('id', abonnement.id)

  if (updateError) {
    return { error: `Databasefeil: ${updateError.message}` }
  }

  // Reaktiver fylke_synlighet hvis abonnementet var utløpt
  if (varUtlopt) {
    await serviceClient
      .from('fylke_synlighet')
      .update({ er_aktiv: true })
      .eq('takstmann_id', takstmannId)
      .eq('er_aktiv', false)
  }

  // Logg hendelsen
  await serviceClient
    .from('admin_hendelse_logg')
    .insert({
      admin_user_id: user.id,
      hendelse_type: 'forleng_proveperiode',
      target_id: takstmannId,
      target_type: 'takstmann',
      detaljer: {
        takstmann_navn: takstmann.navn,
        ekstra_dager: ekstraDager,
        gammel_slutt: abonnement.proveperiode_slutt,
        ny_slutt: nySlutt.toISOString(),
        reaktivert: varUtlopt,
      },
    })

  revalidatePath(`/portal/admin/takstmenn/${takstmannId}`)
  revalidatePath('/portal/admin/abonnementer')

  return {
    success: true,
    nySlutt: nySlutt.toISOString(),
    reaktivert: varUtlopt,
  }
}
