import { createClient } from "@/lib/supabase/server";

const GYLDIGE_VURDERINGER = ["bra", "justeringer", "darlig"] as const;

export async function POST(request: Request) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  // Valider påkrevde felter
  const { bygningsdel, underenhet, observasjon, vurdering } = body;

  if (
    typeof bygningsdel !== "string" ||
    typeof underenhet !== "string" ||
    typeof observasjon !== "string" ||
    typeof vurdering !== "string"
  ) {
    return Response.json(
      { error: "Mangler påkrevde felter: bygningsdel, underenhet, observasjon, vurdering" },
      { status: 400 }
    );
  }

  if (!GYLDIGE_VURDERINGER.includes(vurdering as typeof GYLDIGE_VURDERINGER[number])) {
    return Response.json(
      { error: "Ugyldig vurdering — må være 'bra', 'justeringer' eller 'darlig'" },
      { status: 400 }
    );
  }

  // Sett inn
  const { error } = await supabase.from("arkat_feedback").insert({
    user_id: user.id,
    bygningsdel,
    underenhet,
    tilstandsgrad: typeof body.tilstandsgrad === "string" ? body.tilstandsgrad : null,
    observasjon,
    arsak: typeof body.arsak === "string" && body.arsak.trim() ? body.arsak.trim() : null,
    resultat_arsak: typeof body.resultat_arsak === "string" ? body.resultat_arsak : null,
    resultat_risiko: typeof body.resultat_risiko === "string" ? body.resultat_risiko : null,
    resultat_konsekvens: typeof body.resultat_konsekvens === "string" ? body.resultat_konsekvens : null,
    resultat_tiltak: typeof body.resultat_tiltak === "string" ? body.resultat_tiltak : null,
    resultat_modus: typeof body.resultat_modus === "string" ? body.resultat_modus : null,
    vurdering,
    kommentar: typeof body.kommentar === "string" && body.kommentar.trim() ? body.kommentar.trim() : null,
  });

  if (error) {
    console.error("Feil ved lagring av ARKAT-feedback:", error);
    return Response.json({ error: "Kunne ikke lagre feedback" }, { status: 500 });
  }

  return Response.json({ success: true });
}
