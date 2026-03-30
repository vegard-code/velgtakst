'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { opprettVippsBetaling, captureVippsBetaling } from '@/lib/vipps/payment'

/**
 * Send Vipps-betalingsforespørsel for et oppdrag
 *
 * Kalles av takstmann fra oppdragssiden når de vil sende betaling via Vipps
 * i stedet for (eller i tillegg til) tradisjonell faktura.
 */
export async function sendVippsBetalingForOppdrag(oppdragId: string) {
  const supabase = await createServiceClient()

  // Hent oppdrag med kundeinfo
  const { data: oppdrag, error } = await supabase
    .from('oppdrag')
    .select(`
      *,
      privatkunde:privatkunde_profiler(navn, telefon, epost),
      company:companies(navn)
    `)
    .eq('id', oppdragId)
    .single()

  if (error || !oppdrag) {
    return { error: 'Fant ikke oppdraget.' }
  }

  if (!oppdrag.totalbelop || oppdrag.totalbelop <= 0) {
    return { error: 'Oppdraget mangler totalbeløp. Sett beløp først.' }
  }

  // Sjekk at oppdraget har en kunde med telefonnummer
  const kundeTelefon = oppdrag.privatkunde?.telefon

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  try {
    const result = await opprettVippsBetaling({
      reference: `oppdrag-${oppdragId}`,
      amountInOre: Math.round(oppdrag.totalbelop * 100),
      description: `Takst – ${oppdrag.adresse ?? 'oppdrag'}`,
      customerPhone: kundeTelefon || undefined,
      returnUrl: `${siteUrl}/portal/kunde/oppdrag/${oppdragId}?betaling=ok`,
      callbackUrl: `${siteUrl}/api/vipps/webhook`,
    })

    // Oppdater oppdrag med Vipps-referanse
    await supabase
      .from('oppdrag')
      .update({
        vipps_referanse: result.reference,
        betalingsmetode: 'vipps',
        updated_at: new Date().toISOString(),
      })
      .eq('id', oppdragId)

    // Logg status
    await supabase.from('status_logg').insert({
      oppdrag_id: oppdragId,
      status: 'vipps_betaling_sendt',
      kommentar: `Vipps-betaling opprettet: ${oppdrag.totalbelop} kr`,
    })

    return { success: true, redirectUrl: result.redirectUrl }
  } catch (err) {
    console.error('Vipps payment error:', err)
    return { error: 'Kunne ikke opprette Vipps-betaling. Prøv igjen.' }
  }
}

/**
 * Capture en Vipps-betaling manuelt
 * (normalt gjøres dette automatisk via webhook)
 */
export async function captureVippsForOppdrag(oppdragId: string) {
  const supabase = await createServiceClient()

  const { data: oppdrag } = await supabase
    .from('oppdrag')
    .select('vipps_referanse, totalbelop')
    .eq('id', oppdragId)
    .single()

  if (!oppdrag?.vipps_referanse || !oppdrag.totalbelop) {
    return { error: 'Ingen Vipps-betaling funnet for dette oppdraget.' }
  }

  try {
    await captureVippsBetaling(
      oppdrag.vipps_referanse,
      Math.round(oppdrag.totalbelop * 100)
    )

    // Oppdater oppdrag-status
    await supabase
      .from('oppdrag')
      .update({
        status: 'betalt',
        betalt_dato: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', oppdragId)

    await supabase.from('status_logg').insert({
      oppdrag_id: oppdragId,
      status: 'betalt',
      kommentar: `Vipps-betaling captured: ${oppdrag.totalbelop} kr`,
    })

    return { success: true }
  } catch (err) {
    console.error('Vipps capture error:', err)
    return { error: 'Kunne ikke fullføre betalingen.' }
  }
}
