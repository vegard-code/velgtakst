'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { opprettAgreement, stoppAgreement } from '@/lib/vipps/recurring'
import { FYLKER, getFylkePris } from '@/lib/supabase/types'

/**
 * Beregn månedlig totalkostnad basert på aktive fylker
 */
export async function beregnMaanedligKostnad(takstmannId: string): Promise<number> {
  const supabase = await createClient()

  const { data: aktive } = await supabase
    .from('fylke_synlighet')
    .select('fylke_id')
    .eq('takstmann_id', takstmannId)
    .eq('er_aktiv', true)

  if (!aktive || aktive.length === 0) return 0

  return aktive.reduce((sum, row) => {
    const fylke = FYLKER.find(f => f.id === row.fylke_id)
    return sum + (fylke ? getFylkePris(fylke.id) : 199)
  }, 0)
}

/**
 * Start Vipps Recurring abonnement for en takstmann.
 */
export async function startVippsAbonnement(companyId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Ikke innlogget' }

  const { data: takstmann } = await supabase
    .from('takstmann_profiler')
    .select('id, telefon, company_id')
    .eq('user_id', user.id)
    .single()

  if (!takstmann || takstmann.company_id !== companyId) {
    return { error: 'Ugyldig bedrift' }
  }

  const maanedligKroner = await beregnMaanedligKostnad(takstmann.id)
  if (maanedligKroner === 0) {
    return { error: 'Du har ingen aktive fylker. Aktiver minst ett fylke først.' }
  }

  const maanedligOre = maanedligKroner * 100
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  try {
    console.log('startVippsAbonnement: calling opprettAgreement with', {
      maanedligKroner,
      maanedligOre,
      companyId,
      siteUrl,
      telefon: takstmann.telefon ? '***' : 'null',
    })

    const result = await opprettAgreement({
      customerPhone: takstmann.telefon || undefined,
      monthlyAmountOre: maanedligOre,
      productName: `VelgTakst Fylkesynlighet`,
      reference: `velgtakst-${companyId}`,
      returnUrl: `${siteUrl}/portal/takstmann/abonnement?status=ok`,
      notificationUrl: `${siteUrl}/api/vipps/recurring-webhook`,
    })

    console.log('startVippsAbonnement: agreement created, id =', result.agreementId)

    // Lagre agreement ID (service client for abonnementer-tabellen)
    await serviceClient
      .from('abonnementer')
      .update({
        vipps_agreement_id: result.agreementId,
        vipps_agreement_status: 'PENDING',
        maanedlig_belop: maanedligOre,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)

    revalidatePath('/portal/takstmann/abonnement')
    return { success: true, confirmationUrl: result.vippsConfirmationUrl }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('Start Vipps abonnement error:', errorMessage)
    return { error: `Vipps-feil: ${errorMessage}` }
  }
}

/**
 * Si opp abonnement via Vipps
 */
export async function siOppAbonnement(companyId: string) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: abonnement } = await serviceClient
    .from('abonnementer')
    .select('vipps_agreement_id, status')
    .eq('company_id', companyId)
    .single()

  if (!abonnement?.vipps_agreement_id) {
    // Ingen Vipps-avtale — bare sett status til kansellert
    await serviceClient
      .from('abonnementer')
      .update({
        status: 'kansellert',
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)

    // Deaktiver alle fylker
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: takstmann } = await supabase
        .from('takstmann_profiler')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (takstmann) {
        await supabase
          .from('fylke_synlighet')
          .update({ er_aktiv: false })
          .eq('takstmann_id', takstmann.id)
      }
    }

    revalidatePath('/portal/takstmann/abonnement')
    revalidatePath('/portal/takstmann/fylker')
    return { success: true }
  }

  try {
    await stoppAgreement(abonnement.vipps_agreement_id)

    await serviceClient
      .from('abonnementer')
      .update({
        status: 'kansellert',
        vipps_agreement_status: 'STOPPED',
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)

    revalidatePath('/portal/takstmann/abonnement')
    revalidatePath('/portal/takstmann/fylker')
    return { success: true }
  } catch (err) {
    console.error('Si opp abonnement error:', err)
    return { error: 'Kunne ikke si opp abonnement. Kontakt oss.' }
  }
}
