import { createClient } from "@/lib/supabase/server";
import { isArkatEnabled } from "@/features/arkat/lib/feature-flag";
import { harFeatureTilgang } from "@/lib/feature-tilgang";
import { ArkatInputSchema } from "@/features/arkat/lib/validators";
import { generateArkat } from "@/features/arkat/lib/generate";
import type {
  ArkatGenerateInput,
  ArkatGenerateResponse,
} from "@/features/arkat/types/arkat";

export async function POST(request: Request) {
  // 1. Global feature flag (kill switch)
  if (!isArkatEnabled()) {
    return Response.json(
      { error: "Funksjonen er ikke tilgjengelig" },
      { status: 404 }
    );
  }

  // 2. Auth — bruker må være innlogget
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Ikke innlogget" },
      { status: 401 }
    );
  }

  // 3. Rollesjekk — kun takstmann, takstmann_admin og admin
  const { data: profil } = await supabase
    .from("user_profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();

  const tillattRoller = ["takstmann", "takstmann_admin", "admin"];
  if (!profil || !tillattRoller.includes(profil.rolle)) {
    return Response.json(
      { error: "Ingen tilgang" },
      { status: 403 }
    );
  }

  // 4. Feature-tilgang — bruker må ha eksplisitt tilgang til ARKAT
  // Admin har alltid tilgang (de administrerer funksjonen)
  if (profil.rolle !== "admin") {
    const harTilgang = await harFeatureTilgang(user.id, "arkat_skrivehjelp");
    if (!harTilgang) {
      return Response.json(
        { error: "Du har ikke tilgang til ARKAT Skrivehjelp. Kontakt administrator." },
        { status: 403 }
      );
    }
  }

  // 5. Parse og valider input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Ugyldig JSON" },
      { status: 400 }
    );
  }

  const parseResult = ArkatInputSchema.safeParse(body);
  if (!parseResult.success) {
    const feil = parseResult.error.issues.map((i) => i.message);
    const response: ArkatGenerateResponse = {
      success: false,
      screening: {
        approved_for_generation: false,
        reason: feil.join(". "),
        warnings: [],
      },
      result: null,
    };
    return Response.json(response, { status: 400 });
  }

  const input: ArkatGenerateInput = parseResult.data;

  // 6. Generering
  try {
    const genResponse = await generateArkat(input);

    if (!genResponse.success) {
      return Response.json(genResponse, { status: 422 });
    }

    return Response.json(genResponse);
  } catch (err) {
    console.error("ARKAT generering feilet:", err);
    return Response.json(
      { error: "Generering feilet. Prøv igjen." },
      { status: 500 }
    );
  }
}
