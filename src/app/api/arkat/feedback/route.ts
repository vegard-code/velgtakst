import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const GYLDIGE_VURDERINGER = ["bra", "justeringer", "darlig"] as const;
const GYLDIGE_MODI = ["standard", "merknad"] as const;

const FeedbackSchema = z.object({
  bygningsdel: z.string().min(1),
  underenhet: z.string().min(1),
  tilstandsgrad: z.string().optional(),
  observasjon: z.string().min(1),
  arsak: z.string().optional().transform(v => v?.trim() || undefined),
  akuttgrad: z.string().optional().transform(v => v?.trim() || undefined),
  hovedgrunnlag: z.string().optional().transform(v => v?.trim() || undefined),
  tilleggsgrunnlag: z.array(z.string()).optional(),
  ns_versjon: z.string().optional(),
  resultat_arsak: z.string().optional(),
  resultat_risiko: z.string().optional(),
  resultat_konsekvens: z.string().optional(),
  resultat_tiltak: z.string().optional(),
  resultat_modus: z.enum(GYLDIGE_MODI).optional(),
  vurdering: z.enum(GYLDIGE_VURDERINGER),
  kommentar: z.string().optional().transform(v => v?.trim() || undefined),
});

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
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  // Valider med Zod
  const parsed = FeedbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: "Ugyldig input", detaljer: parsed.error.issues.map(i => i.message) },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Sett inn
  const { error } = await supabase.from("arkat_feedback").insert({
    user_id: user.id,
    bygningsdel: data.bygningsdel,
    underenhet: data.underenhet,
    tilstandsgrad: data.tilstandsgrad ?? null,
    observasjon: data.observasjon,
    arsak: data.arsak ?? null,
    akuttgrad: data.akuttgrad ?? null,
    hovedgrunnlag: data.hovedgrunnlag ?? null,
    tilleggsgrunnlag: data.tilleggsgrunnlag ?? null,
    ns_versjon: data.ns_versjon ?? null,
    resultat_arsak: data.resultat_arsak ?? null,
    resultat_risiko: data.resultat_risiko ?? null,
    resultat_konsekvens: data.resultat_konsekvens ?? null,
    resultat_tiltak: data.resultat_tiltak ?? null,
    resultat_modus: data.resultat_modus ?? null,
    vurdering: data.vurdering,
    kommentar: data.kommentar ?? null,
  });

  if (error) {
    console.error("Feil ved lagring av ARKAT-feedback:", error);
    return Response.json({ error: "Kunne ikke lagre feedback" }, { status: 500 });
  }

  return Response.json({ success: true });
}
