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
const DEFAULT_MODEL = "gpt-4o";
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

/** Strukturert ARKAT-resultat fra AI */
export interface AiArkatResultat {
  arsak: string;
  risiko: string;
  konsekvens: string;
  anbefalt_tiltak: string;
  varsler: string[];
}

/** JSON Schema for strukturert output */
const ARKAT_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    arsak: {
      type: "string" as const,
      description: "Årsak — hva er observert, reformulert faglig",
    },
    risiko: {
      type: "string" as const,
      description: "Risiko — hva kan skje dersom forholdet ikke utbedres",
    },
    konsekvens: {
      type: "string" as const,
      description: "Konsekvens — kostnadsmessig konsekvens for kjøper",
    },
    anbefalt_tiltak: {
      type: "string" as const,
      description: "Anbefalt tiltak — konkret utbedringsforslag",
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
  required: ["arsak", "risiko", "konsekvens", "anbefalt_tiltak", "varsler"] as const,
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
export function mockArkatResultat(observasjon: string): AiArkatResultat {
  const kortObs =
    observasjon.length > 80
      ? observasjon.slice(0, 80) + "..."
      : observasjon;

  return {
    arsak: `[MOCK] Det er registrert ${kortObs.toLowerCase()}`,
    risiko:
      "[MOCK] Uten utbedring er det risiko for følgeskader i konstruksjonen.",
    konsekvens:
      "[MOCK] Kjøper bør påregne kostnad til utbedring. Omfanget bør kartlegges nærmere.",
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
    "arsak",
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
