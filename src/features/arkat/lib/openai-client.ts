/**
 * OpenAI Response API-klient for ARKAT Skrivehjelp.
 *
 * Bruker Response API (POST /v1/responses) med strukturert JSON-output.
 * Ingen ekstern SDK-avhengighet — bruker fetch direkte for å unngå
 * versjonsavhengigheter og holde integrasjonen slank.
 *
 * Tre moduser:
 * 1. LIVE:  OPENAI_API_KEY er satt → ekte API-kall
 * 2. MOCK:  ARKAT_AI_MOCK=true → returnerer deterministisk mock-svar
 * 3. AV:    Ingen nøkkel, ingen mock → fallback til lokal motor
 */

// ─── Konfigurasjon ─────────────────────────────────────────

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1";
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Sjekk om AI-generering er tilgjengelig.
 * Returnerer "live" | "mock" | "av".
 */
export function aiModus(): "live" | "mock" | "av" {
  if (process.env.ARKAT_AI_MOCK === "true") return "mock";
  if (process.env.OPENAI_API_KEY) return "live";
  return "av";
}

// ─── Typer ─────────────────────────────────────────────────

/** Strukturert ARKAT-resultat fra AI.
 *  Observasjon og Årsak er pass-through fra takstmannens input og generes IKKE av AI. */
export interface AiArkatResultat {
  risiko: string;
  konsekvens: string;
  anbefalt_tiltak: string;
  varsler: string[];
}

/** JSON Schema for strukturert output.
 *  AI genererer KUN Risiko, Konsekvens, Anbefalt tiltak og varsler.
 *  Observasjon og Årsak er takstmannens tekst og settes på av kallende kode. */
const ARKAT_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    risiko: {
      type: "string" as const,
      description:
        "Risiko — hva kan utvikle seg i bygningsdelen dersom forholdet ikke utbedres. " +
        "RETTSLIG BÆRENDE varsling til kjøper, må oppfylle to krav: " +
        "(1) navngi konkret mekanisme (fukt, råte, korrosjon, setning, frost/frostsprengning, " +
        "bom, nedbrytning av tetning, lekkasje, svekket innfesting, osv.) og " +
        "(2) bruke fremtidsrettet språk («kan føre til», «risiko for», «gir over tid»). " +
        "SKAL IKKE handle om kjøper, kostnader eller tiltak — det hører under konsekvens/anbefalt_tiltak. " +
        "SKAL IKKE være tom formel uten mekanisme («kan gi konsekvenser»).",
    },
    konsekvens: {
      type: "string" as const,
      description:
        "Konsekvens — den konkrete følgen for kjøper av at årsaken foreligger. " +
        "Kan dekke én eller flere av tre kategorier: " +
        "(a) funksjonssvikt (redusert brukbarhet, komfort, inneklima, sikkerhet), " +
        "(b) utbedringskostnader (kjøpers forventede utbedringsbehov, uten konkrete kronebeløp), " +
        "(c) uavklart skadeomfang (hva kjøper overtar av ukartlagt/skjult tilstand). " +
        "Skal være en «mashup» som binder teknisk utfall (fra risiko) til kjøpers realitet. " +
        "SKAL IKKE åpne rutinemessig med «Kjøper må påregne» eller «Kjøper bør påregne» — " +
        "det er én av mange legitime åpninger, ikke malen. Varier med f.eks. «Ved forverring...», " +
        "«Et slikt skadeforløp gir...», «Utbedring innebærer...», «Forholdet gir usikkerhet om...». " +
        "SKAL IKKE inneholde «videre oppfølging» eller «undersøkelser kjøper bør bestille» — det hører under anbefalt_tiltak. " +
        "SKAL IKKE være ren teknisk beskrivelse uten kjøperanker — da hører det under risiko. " +
        "SKAL IKKE være sirkulær (gjenta risiko med «kjøper bør...» foran).",
    },
    anbefalt_tiltak: {
      type: "string" as const,
      description:
        "Anbefalt tiltak — konkret utbedringsforslag. Alle råd, " +
        "anbefalinger, og «bør gjøre»-formuleringer hører her.",
    },
    varsler: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        "Eventuelle varsler eller forbehold. Inkluder varsel hvis: " +
        "observasjonen er vag/tvetydig, du er usikker på tolkningen, " +
        "risikoteksten bygger på antakelser, eller alder brukes uten " +
        "konkrete symptomer. Tom liste hvis ingen forbehold.",
    },
  },
  required: ["risiko", "konsekvens", "anbefalt_tiltak", "varsler"] as const,
  additionalProperties: false as const,
};

// ─── Response API-kall ─────────────────────────────────────

export interface ResponseApiRequest {
  /** System-instruksjoner (regler, kontekst, persona) */
  instructions: string;
  /** Brukerens input (observasjon + metadata) */
  input: string;
  /** Modell — default gpt-4o */
  model?: string;
}

/**
 * Kall OpenAI Response API med strukturert JSON-output.
 * Kaster feil ved nettverksproblemer, timeout eller ugyldig respons.
 */
export async function kallResponseApi(
  req: ResponseApiRequest
): Promise<AiArkatResultat> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY er ikke satt");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: req.model ?? DEFAULT_MODEL,
        instructions: req.instructions,
        input: req.input,
        text: {
          format: {
            type: "json_schema",
            name: "arkat_resultat",
            strict: true,
            schema: ARKAT_OUTPUT_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `OpenAI Response API feilet (${response.status}): ${errorBody.slice(0, 300)}`
      );
    }

    const data = await response.json();

    // Response API returnerer output[] med type "message" → content[] med type "output_text"
    const outputText = extractOutputText(data);
    if (!outputText) {
      throw new Error("Kunne ikke finne output_text i API-respons");
    }

    const parsed = JSON.parse(outputText) as AiArkatResultat;
    validerArkatResultat(parsed);
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Mock-modus ────────────────────────────────────────────

/**
 * Returner deterministisk mock-svar.
 * Brukes for testing uten API-nøkkel.
 * Markert tydelig som mock slik at det ikke kan forveksles med ekte AI-output.
 */
export function mockArkatResultat(): AiArkatResultat {
  return {
    risiko:
      "[MOCK] Uten utbedring er det risiko for følgeskader i konstruksjonen.",
    konsekvens:
      "[MOCK] Ved forverring kan det oppstå fuktskader i bjelkelag og soppvekst, " +
      "med tilhørende sanerings- og utbedringskostnader som kjøper må ta høyde for.",
    anbefalt_tiltak:
      "[MOCK] Det anbefales utbedring. Innhent vurdering fra kvalifisert fagperson.",
    varsler: ["[MOCK] Dette er et mock-svar, ikke generert av AI."],
  };
}

// ─── Interne hjelpefunksjoner ──────────────────────────────

/**
 * Ekstraher output-tekst fra Response API-svar.
 *
 * Response API-format:
 * { output: [{ type: "message", content: [{ type: "output_text", text: "..." }] }] }
 */
function extractOutputText(data: Record<string, unknown>): string | null {
  const output = data.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      item.type === "message" &&
      "content" in item &&
      Array.isArray(item.content)
    ) {
      for (const c of item.content) {
        if (
          typeof c === "object" &&
          c !== null &&
          "type" in c &&
          c.type === "output_text" &&
          "text" in c &&
          typeof c.text === "string"
        ) {
          return c.text;
        }
      }
    }
  }
  return null;
}

/** Valider at AI-resultatet har alle påkrevde felter med innhold */
function validerArkatResultat(r: AiArkatResultat): void {
  const felter: (keyof AiArkatResultat)[] = [
    "risiko",
    "konsekvens",
    "anbefalt_tiltak",
  ];
  for (const felt of felter) {
    if (typeof r[felt] !== "string" || r[felt].trim().length === 0) {
      throw new Error(`AI-resultatet mangler innhold i feltet '${felt}'`);
    }
  }
}
