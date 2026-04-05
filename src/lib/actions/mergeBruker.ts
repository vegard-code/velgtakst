'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function mergeBrukere(
  bevarId: string,  // user_id som beholdes
  slettId: string   // user_id som slettes og merges inn
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikke autentisert' }

  const svc = await createServiceClient()
  const { data: adminProfil } = await svc
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .single()
  if (adminProfil?.rolle !== 'admin') return { success: false, error: 'Krever admin-tilgang' }
  if (bevarId === slettId) return { success: false, error: 'Kan ikke merge en bruker med seg selv' }

  try {
    // Hent profil-IDer for begge brukere
    const [
      { data: bevarTakst },
      { data: slettTakst },
      { data: bevarMegler },
      { data: slettMegler },
      { data: bevarKunde },
      { data: slettKunde },
    ] = await Promise.all([
      svc.from('takstmann_profiler').select('id').eq('user_id', bevarId).maybeSingle(),
      svc.from('takstmann_profiler').select('id').eq('user_id', slettId).maybeSingle(),
      svc.from('megler_profiler').select('id').eq('user_id', bevarId).maybeSingle(),
      svc.from('megler_profiler').select('id').eq('user_id', slettId).maybeSingle(),
      svc.from('privatkunde_profiler').select('id').eq('user_id', bevarId).maybeSingle(),
      svc.from('privatkunde_profiler').select('id').eq('user_id', slettId).maybeSingle(),
    ])

    // ── Takstmann-profil ──────────────────────────────────────
    if (slettTakst) {
      const slettTakstId = slettTakst.id
      if (bevarTakst) {
        const bevarTakstId = bevarTakst.id
        // Flytt FK-referanser til bevar sin profil
        await svc.from('oppdrag').update({ takstmann_id: bevarTakstId }).eq('takstmann_id', slettTakstId)
        await svc.from('bestillinger').update({ takstmann_id: bevarTakstId }).eq('takstmann_id', slettTakstId)
        // samtaler har CASCADE DELETE — må oppdateres FØR profilen slettes
        await svc.from('samtaler').update({ takstmann_id: bevarTakstId }).eq('takstmann_id', slettTakstId)
        await svc.from('megler_vurderinger').update({ takstmann_id: bevarTakstId }).eq('takstmann_id', slettTakstId)

        // fylke_synlighet: slett overlappende rader, flytt resten
        const { data: bevarFylker } = await svc
          .from('fylke_synlighet').select('fylke_id').eq('takstmann_id', bevarTakstId)
        const bevarFylkeIds = (bevarFylker ?? []).map(f => f.fylke_id)
        if (bevarFylkeIds.length > 0) {
          await svc.from('fylke_synlighet').delete()
            .eq('takstmann_id', slettTakstId).in('fylke_id', bevarFylkeIds)
        }
        await svc.from('fylke_synlighet').update({ takstmann_id: bevarTakstId }).eq('takstmann_id', slettTakstId)

        // kommune_synlighet: slett overlappende, flytt resten
        const { data: bevarKommuner } = await svc
          .from('kommune_synlighet').select('kommune_id').eq('takstmann_id', bevarTakstId)
        const bevarKommuneIds = (bevarKommuner ?? []).map(k => k.kommune_id)
        if (bevarKommuneIds.length > 0) {
          await svc.from('kommune_synlighet').delete()
            .eq('takstmann_id', slettTakstId).in('kommune_id', bevarKommuneIds)
        }
        await svc.from('kommune_synlighet').update({ takstmann_id: bevarTakstId }).eq('takstmann_id', slettTakstId)

        // Nå er det trygt å slette
        await svc.from('takstmann_profiler').delete().eq('id', slettTakstId)
      } else {
        // Bevar har ingen takstmann-profil — overfør den fra slett
        await svc.from('takstmann_profiler').update({ user_id: bevarId }).eq('id', slettTakstId)
      }
    }

    // ── Megler-profil ─────────────────────────────────────────
    if (slettMegler) {
      const slettMeglerId = slettMegler.id
      if (bevarMegler) {
        const bevarMeglerId = bevarMegler.id
        await svc.from('oppdrag').update({ megler_id: bevarMeglerId }).eq('megler_id', slettMeglerId)
        await svc.from('bestillinger').update({ bestilt_av_megler_id: bevarMeglerId }).eq('bestilt_av_megler_id', slettMeglerId)
        await svc.from('samtaler').update({ megler_id: bevarMeglerId }).eq('megler_id', slettMeglerId)
        await svc.from('megler_vurderinger').update({ megler_id: bevarMeglerId }).eq('megler_id', slettMeglerId)
        await svc.from('megler_profiler').delete().eq('id', slettMeglerId)
      } else {
        await svc.from('megler_profiler').update({ user_id: bevarId }).eq('id', slettMeglerId)
      }
    }

    // ── Privatkunde-profil ────────────────────────────────────
    if (slettKunde) {
      const slettKundeId = slettKunde.id
      if (bevarKunde) {
        const bevarKundeId = bevarKunde.id
        await svc.from('oppdrag').update({ privatkunde_id: bevarKundeId }).eq('privatkunde_id', slettKundeId)
        await svc.from('bestillinger').update({ bestilt_av_kunde_id: bevarKundeId }).eq('bestilt_av_kunde_id', slettKundeId)
        await svc.from('samtaler').update({ kunde_id: bevarKundeId }).eq('kunde_id', slettKundeId)
        await svc.from('megler_vurderinger').update({ kunde_id: bevarKundeId }).eq('kunde_id', slettKundeId)
        await svc.from('privatkunde_profiler').delete().eq('id', slettKundeId)
      } else {
        await svc.from('privatkunde_profiler').update({ user_id: bevarId }).eq('id', slettKundeId)
      }
    }

    // ── Direkte bruker-referanser ─────────────────────────────
    await svc.from('meldinger').update({ avsender_id: bevarId }).eq('avsender_id', slettId)
    await svc.from('dokumenter').update({ lastet_opp_av: bevarId }).eq('lastet_opp_av', slettId)

    // varsel_innstillinger har UNIQUE på user_id
    const { data: bevarVarsel } = await svc
      .from('varsel_innstillinger').select('id').eq('user_id', bevarId).maybeSingle()
    if (bevarVarsel) {
      await svc.from('varsel_innstillinger').delete().eq('user_id', slettId)
    } else {
      await svc.from('varsel_innstillinger').update({ user_id: bevarId }).eq('user_id', slettId)
    }

    // ── Slett gammel bruker ───────────────────────────────────
    await svc.from('user_profiles').delete().eq('id', slettId)
    await svc.auth.admin.deleteUser(slettId)

    // ── Logg ─────────────────────────────────────────────────
    await svc.from('admin_hendelse_logg').insert({
      admin_user_id: user.id,
      hendelse_type: 'merge_bruker',
      target_id: bevarId,
      target_type: 'user',
      detaljer: { slettet_user_id: slettId, beholdt_user_id: bevarId },
    })

    revalidatePath('/portal/admin/brukere')
    return { success: true }
  } catch (err) {
    const melding = err instanceof Error ? err.message : 'Ukjent feil'
    console.error('mergeBrukere feil:', err)
    return { success: false, error: melding }
  }
}
