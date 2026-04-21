'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

type Svc = Awaited<ReturnType<typeof createServiceClient>>

// Rolle-prioritet — høyere vekt = mer privilegert.
// Brukes til å velge riktig rolle når begge brukere har user_profiles.
const ROLLE_VEKT: Record<string, number> = {
  privatkunde: 1,
  megler: 2,
  takstmann: 3,
  takstmann_admin: 4,
  admin: 5,
}

function velgHoyesteRolle(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null
  if (!b) return a
  return (ROLLE_VEKT[a] ?? 0) >= (ROLLE_VEKT[b] ?? 0) ? a : b
}

/**
 * Fletter felt-for-felt: beholder bevar sine verdier, men fyller tomme
 * felter i bevar med verdier fra slett. Returnerer kun feltene som
 * faktisk skal oppdateres på bevar-raden.
 */
function flettTommeFelter(
  bevar: Record<string, unknown>,
  slett: Record<string, unknown>,
  felter: string[],
): Record<string, unknown> {
  const oppdateringer: Record<string, unknown> = {}
  for (const felt of felter) {
    const bevarVerdi = bevar[felt]
    const slettVerdi = slett[felt]
    const bevarErTom = bevarVerdi === null || bevarVerdi === undefined || bevarVerdi === ''
    const slettHarVerdi = slettVerdi !== null && slettVerdi !== undefined && slettVerdi !== ''
    if (bevarErTom && slettHarVerdi) {
      oppdateringer[felt] = slettVerdi
    }
  }
  return oppdateringer
}

/**
 * Tar union av to TEXT[]-kolonner. Returnerer null hvis begge er tomme.
 */
function flettArrayFelt(bevar: string[] | null | undefined, slett: string[] | null | undefined): string[] | null {
  const bev = bevar ?? []
  const sle = slett ?? []
  if (bev.length === 0 && sle.length === 0) return null
  return Array.from(new Set([...bev, ...sle]))
}

/**
 * Tar snapshot av slett-brukerens komplette tilstand før merging.
 * Lagres i admin_hendelse_logg slik at vi kan rekonstruere manuelt
 * hvis noe går galt eller brukeren angrer.
 */
async function hentSlettSnapshot(svc: Svc, userId: string) {
  const [
    authUser,
    userProfil,
    takstProfil,
    meglerProfil,
    kundeProfil,
    featureTilganger,
    varselInnstillinger,
  ] = await Promise.all([
    svc.auth.admin.getUserById(userId),
    svc.from('user_profiles').select('*').eq('id', userId).maybeSingle(),
    svc.from('takstmann_profiler').select('*').eq('user_id', userId).maybeSingle(),
    svc.from('megler_profiler').select('*').eq('user_id', userId).maybeSingle(),
    svc.from('privatkunde_profiler').select('*').eq('user_id', userId).maybeSingle(),
    svc.from('feature_tilgang').select('*').eq('user_id', userId),
    svc.from('varsel_innstillinger').select('*').eq('user_id', userId).maybeSingle(),
  ])

  return {
    auth_user: authUser.data.user
      ? {
          id: authUser.data.user.id,
          email: authUser.data.user.email,
          phone: authUser.data.user.phone,
          user_metadata: authUser.data.user.user_metadata,
          app_metadata: authUser.data.user.app_metadata,
          created_at: authUser.data.user.created_at,
        }
      : null,
    user_profiles: userProfil.data ?? null,
    takstmann_profiler: takstProfil.data ?? null,
    megler_profiler: meglerProfil.data ?? null,
    privatkunde_profiler: kundeProfil.data ?? null,
    feature_tilgang: featureTilganger.data ?? [],
    varsel_innstillinger: varselInnstillinger.data ?? null,
  }
}

export async function mergeBrukere(
  bevarId: string,  // user_id som beholdes
  slettId: string,  // user_id som slettes og merges inn
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikke autentisert' }

  const svc = await createServiceClient()
  const { data: adminProfil, error: adminProfilError } = await svc
    .from('user_profiles')
    .select('rolle')
    .eq('id', user.id)
    .maybeSingle()
  if (adminProfilError) {
    console.error('[user_profiles] Feil ved henting av profil i mergeBrukere:', adminProfilError.message)
    return { success: false, error: 'Feil ved henting av profil' }
  }
  if (adminProfil?.rolle !== 'admin') return { success: false, error: 'Krever admin-tilgang' }
  if (bevarId === slettId) return { success: false, error: 'Kan ikke merge en bruker med seg selv' }

  try {
    // ── Snapshot av slett-brukeren FØR noe endres ────────────────
    // Dette gir oss full audit trail og mulighet for manuell
    // rekonstruksjon om noe skulle gå galt.
    const slettSnapshot = await hentSlettSnapshot(svc, slettId)

    // Hent auth-metadata for begge (brukes til vipps_sub-flytting)
    const [{ data: bevarAuth }, { data: slettAuth }] = await Promise.all([
      svc.auth.admin.getUserById(bevarId),
      svc.auth.admin.getUserById(slettId),
    ])

    // ── 1. Flytt vipps_sub hvis bevar mangler den ─────────────────
    // CASCADE DELETE på auth.users tar med seg all slett sin metadata,
    // så vi må flytte vipps_sub over FØR sletting.
    const bevarMeta = (bevarAuth.user?.user_metadata ?? {}) as Record<string, unknown>
    const slettMeta = (slettAuth.user?.user_metadata ?? {}) as Record<string, unknown>
    if (!bevarMeta.vipps_sub && slettMeta.vipps_sub) {
      const nyMeta = { ...bevarMeta, vipps_sub: slettMeta.vipps_sub }
      await svc.auth.admin.updateUserById(bevarId, { user_metadata: nyMeta })
    }

    // ── 2. Hent fulle profil-rader for merging ───────────────────
    const [
      { data: bevarTakst },
      { data: slettTakst },
      { data: bevarMegler },
      { data: slettMegler },
      { data: bevarKunde },
      { data: slettKunde },
      { data: bevarUserProfil },
      { data: slettUserProfil },
    ] = await Promise.all([
      svc.from('takstmann_profiler')
        .select('id, user_id, company_id, navn, tittel, spesialitet, bio, telefon, epost, bilde_url, sertifiseringer')
        .eq('user_id', bevarId).maybeSingle(),
      svc.from('takstmann_profiler')
        .select('id, user_id, company_id, navn, tittel, spesialitet, bio, telefon, epost, bilde_url, sertifiseringer')
        .eq('user_id', slettId).maybeSingle(),
      svc.from('megler_profiler')
        .select('id, user_id, company_id, navn, telefon, epost, meglerforetak')
        .eq('user_id', bevarId).maybeSingle(),
      svc.from('megler_profiler')
        .select('id, user_id, company_id, navn, telefon, epost, meglerforetak')
        .eq('user_id', slettId).maybeSingle(),
      svc.from('privatkunde_profiler')
        .select('id, user_id, navn, telefon, epost')
        .eq('user_id', bevarId).maybeSingle(),
      svc.from('privatkunde_profiler')
        .select('id, user_id, navn, telefon, epost')
        .eq('user_id', slettId).maybeSingle(),
      svc.from('user_profiles').select('id, rolle, navn, telefon, company_id')
        .eq('id', bevarId).maybeSingle(),
      svc.from('user_profiles').select('id, rolle, navn, telefon, company_id')
        .eq('id', slettId).maybeSingle(),
    ])

    // ── 3. Oppdater user_profiles-rolle hvis slett har høyere ────
    if (bevarUserProfil && slettUserProfil) {
      const nyRolle = velgHoyesteRolle(bevarUserProfil.rolle, slettUserProfil.rolle)
      const userProfilOppdatering: Record<string, unknown> = {}
      if (nyRolle && nyRolle !== bevarUserProfil.rolle) {
        userProfilOppdatering.rolle = nyRolle
      }
      // Flett også tomme felter på user_profiles
      const flettede = flettTommeFelter(
        bevarUserProfil as unknown as Record<string, unknown>,
        slettUserProfil as unknown as Record<string, unknown>,
        ['navn', 'telefon', 'company_id'],
      )
      Object.assign(userProfilOppdatering, flettede)
      if (Object.keys(userProfilOppdatering).length > 0) {
        await svc.from('user_profiles').update(userProfilOppdatering).eq('id', bevarId)
      }
    }

    // ── 4. Takstmann-profil ──────────────────────────────────────
    if (slettTakst) {
      const slettTakstId = slettTakst.id
      if (bevarTakst) {
        const bevarTakstId = bevarTakst.id

        // Flett tomme felter fra slett inn i bevar
        const oppdateringer = flettTommeFelter(
          bevarTakst as unknown as Record<string, unknown>,
          slettTakst as unknown as Record<string, unknown>,
          ['navn', 'tittel', 'spesialitet', 'bio', 'telefon', 'epost', 'bilde_url', 'company_id'],
        )
        // Sertifiseringer: union av begge arrays
        const flettetSert = flettArrayFelt(bevarTakst.sertifiseringer, slettTakst.sertifiseringer)
        const bevarSertLengde = (bevarTakst.sertifiseringer ?? []).length
        if (flettetSert && flettetSert.length > bevarSertLengde) {
          oppdateringer.sertifiseringer = flettetSert
        }
        if (Object.keys(oppdateringer).length > 0) {
          await svc.from('takstmann_profiler').update(oppdateringer).eq('id', bevarTakstId)
        }

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

        // Nå er det trygt å slette (dataene er flettet, FK-er flyttet)
        await svc.from('takstmann_profiler').delete().eq('id', slettTakstId)
      } else {
        // Bevar har ingen takstmann-profil — overfør den fra slett
        await svc.from('takstmann_profiler').update({ user_id: bevarId }).eq('id', slettTakstId)
      }
    }

    // ── 5. Megler-profil ─────────────────────────────────────────
    if (slettMegler) {
      const slettMeglerId = slettMegler.id
      if (bevarMegler) {
        const bevarMeglerId = bevarMegler.id

        const oppdateringer = flettTommeFelter(
          bevarMegler as unknown as Record<string, unknown>,
          slettMegler as unknown as Record<string, unknown>,
          ['navn', 'telefon', 'epost', 'meglerforetak', 'company_id'],
        )
        if (Object.keys(oppdateringer).length > 0) {
          await svc.from('megler_profiler').update(oppdateringer).eq('id', bevarMeglerId)
        }

        await svc.from('oppdrag').update({ megler_id: bevarMeglerId }).eq('megler_id', slettMeglerId)
        await svc.from('bestillinger').update({ bestilt_av_megler_id: bevarMeglerId }).eq('bestilt_av_megler_id', slettMeglerId)
        await svc.from('samtaler').update({ megler_id: bevarMeglerId }).eq('megler_id', slettMeglerId)
        await svc.from('megler_vurderinger').update({ megler_id: bevarMeglerId }).eq('megler_id', slettMeglerId)
        await svc.from('megler_profiler').delete().eq('id', slettMeglerId)
      } else {
        await svc.from('megler_profiler').update({ user_id: bevarId }).eq('id', slettMeglerId)
      }
    }

    // ── 6. Privatkunde-profil ────────────────────────────────────
    if (slettKunde) {
      const slettKundeId = slettKunde.id
      if (bevarKunde) {
        const bevarKundeId = bevarKunde.id

        const oppdateringer = flettTommeFelter(
          bevarKunde as unknown as Record<string, unknown>,
          slettKunde as unknown as Record<string, unknown>,
          ['navn', 'telefon', 'epost'],
        )
        if (Object.keys(oppdateringer).length > 0) {
          await svc.from('privatkunde_profiler').update(oppdateringer).eq('id', bevarKundeId)
        }

        await svc.from('oppdrag').update({ privatkunde_id: bevarKundeId }).eq('privatkunde_id', slettKundeId)
        await svc.from('bestillinger').update({ bestilt_av_kunde_id: bevarKundeId }).eq('bestilt_av_kunde_id', slettKundeId)
        await svc.from('samtaler').update({ kunde_id: bevarKundeId }).eq('kunde_id', slettKundeId)
        await svc.from('megler_vurderinger').update({ kunde_id: bevarKundeId }).eq('kunde_id', slettKundeId)
        await svc.from('privatkunde_profiler').delete().eq('id', slettKundeId)
      } else {
        await svc.from('privatkunde_profiler').update({ user_id: bevarId }).eq('id', slettKundeId)
      }
    }

    // ── 7. Flytt feature_tilgang fra slett til bevar ─────────────
    // UNIQUE(user_id, feature) — vi må dedupe. Hvis slett er aktiv
    // og bevar er inaktiv, oppgrader bevar før vi sletter slett-raden.
    // (ARKAT-tilgang forsvant sist pga. CASCADE DELETE når slett-bruker
    //  ble slettet — denne blokken hindrer det.)
    const { data: bevarTilganger } = await svc
      .from('feature_tilgang').select('feature, aktiv').eq('user_id', bevarId)
    const { data: slettTilganger } = await svc
      .from('feature_tilgang').select('feature, aktiv').eq('user_id', slettId)

    const bevarFeatureMap = new Map<string, boolean>(
      (bevarTilganger ?? []).map(t => [t.feature as string, t.aktiv as boolean]),
    )
    for (const slettRad of (slettTilganger ?? []) as { feature: string; aktiv: boolean }[]) {
      if (bevarFeatureMap.has(slettRad.feature)) {
        // Begge har raden. Hvis slett er aktiv og bevar er inaktiv, oppgrader.
        if (slettRad.aktiv && !bevarFeatureMap.get(slettRad.feature)) {
          await svc.from('feature_tilgang').update({ aktiv: true })
            .eq('user_id', bevarId).eq('feature', slettRad.feature)
        }
        // Slett slett sin rad eksplisitt (CASCADE ville gjort det uansett,
        // men vi er eksplisitte for å unngå uklar tilstand).
        await svc.from('feature_tilgang').delete()
          .eq('user_id', slettId).eq('feature', slettRad.feature)
      } else {
        // Bare slett har raden — flytt til bevar
        await svc.from('feature_tilgang').update({ user_id: bevarId })
          .eq('user_id', slettId).eq('feature', slettRad.feature)
      }
    }

    // ── 8. Direkte bruker-referanser ─────────────────────────────
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

    // ── 9. Slett gammel bruker ───────────────────────────────────
    await svc.from('user_profiles').delete().eq('id', slettId)
    await svc.auth.admin.deleteUser(slettId)

    // ── 10. Logg med snapshot for rekonstruerbarhet ──────────────
    await svc.from('admin_hendelse_logg').insert({
      admin_user_id: user.id,
      hendelse_type: 'merge_bruker',
      target_id: bevarId,
      target_type: 'user',
      detaljer: {
        slettet_user_id: slettId,
        beholdt_user_id: bevarId,
        slettet_snapshot: slettSnapshot,
      },
    })

    revalidatePath('/portal/admin/brukere')
    return { success: true }
  } catch (err) {
    const melding = err instanceof Error ? err.message : 'Ukjent feil'
    console.error('mergeBrukere feil:', err)
    return { success: false, error: melding }
  }
}
