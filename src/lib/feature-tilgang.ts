/**
 * Feature-tilgang — server-side sjekk.
 *
 * Gjenbrukbar for alle feature-gates: ARKAT, premium, etc.
 * Brukes fra server components, API-routes og layout.
 *
 * VIKTIG: Bruker createServiceClient (service_role key) for å
 * omgå RLS — dette er bevisst fordi vi sjekker tilgang på vegne
 * av brukeren som allerede er autentisert via Supabase Auth.
 */
import { createServiceClient } from "@/lib/supabase/server";

export type FeatureNavn = "arkat_skrivehjelp";

/**
 * Sjekk om en bruker har tilgang til en feature.
 * Returnerer true hvis:
 * - feature_tilgang-rad finnes
 * - aktiv = true
 * - utloper er NULL eller i fremtiden
 */
export async function harFeatureTilgang(
  userId: string,
  feature: FeatureNavn
): Promise<boolean> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("feature_tilgang")
    .select("aktiv, utloper")
    .eq("user_id", userId)
    .eq("feature", feature)
    .maybeSingle();

  if (error || !data) return false;
  if (!data.aktiv) return false;

  // Sjekk utløpsdato
  if (data.utloper) {
    const utloper = new Date(data.utloper);
    if (utloper < new Date()) return false;
  }

  return true;
}

/**
 * Sett feature-tilgang for en bruker.
 * Brukes fra admin-actions. Upserter — oppretter eller oppdaterer.
 */
export async function settFeatureTilgang(params: {
  userId: string;
  feature: FeatureNavn;
  aktiv: boolean;
  gittAv: string;
  kilde?: "admin" | "abonnement" | "promo";
  merknad?: string;
  utloper?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("feature_tilgang")
    .upsert(
      {
        user_id: params.userId,
        feature: params.feature,
        aktiv: params.aktiv,
        gitt_av: params.gittAv,
        gitt_dato: new Date().toISOString(),
        kilde: params.kilde ?? "admin",
        merknad: params.merknad ?? null,
        utloper: params.utloper ?? null,
      },
      { onConflict: "user_id,feature" }
    );

  if (error) {
    console.error("Feil ved setting av feature-tilgang:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Hent feature-tilganger for en bruker.
 * Returnerer alle features (aktive og inaktive) for admin-visning.
 */
export async function hentFeatureTilganger(userId: string) {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("feature_tilgang")
    .select("feature, aktiv, gitt_dato, utloper, kilde, merknad")
    .eq("user_id", userId);

  if (error) return [];
  return data ?? [];
}
