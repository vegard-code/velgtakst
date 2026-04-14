/**
 * AI-basert ARKAT-generering via OpenAI Response API.
 *
 * Denne modulen håndterer selve AI-kallet og oversetter
 * resultatet til ArkatGeneratedResult. Den kjenner IKKE til
 * screening eller fallback — det styres av generate.ts.
 */
import type { ArkatGenerateInput, ArkatGeneratedResult } from "../types/arkat";
import type { TgTerminologi, UnderenhetTerminologi } from "./terminology";
import {
  aiModus,
  kallResponseApi,
  mockArkatResultat,
} from "./openai-client";
import {
  byggSystemInstruksjoner,
  byggBrukerInput,
} from "./ai-prompt";

// ─── Public API ────────────────────────────────────────────

export interface AiGenereringsResultat {
  /** Om AI-generering ble brukt (true) eller ikke tilgjengelig (false) */
  bruktAi: boolean;
  /** Kilde: "live" | "mock" | null (hvis AI ikke tilgjengelig) */
  kilde: "live" | "mock" | null;
  /** Generert resultat, eller null hvis AI ikke tilgjengelig */
  resultat: ArkatGeneratedResult | null;
  /** Varsler fra AI-modellen (forbehold, usikkerhet, etc.) */
  varsler: string[];
  /** Feilmelding ved teknisk feil (nettverket, parsing, etc.) */
  feil: string | null;
}

/**
 * Forsøk å generere ARKAT via AI.
 *
 * Returnerer alltid et resultatobjekt — kaster aldri.
 * Kalleren (generate.ts) bestemmer hva som skjer ved feil
 * eller "av"-modus (fallback til lokal motor).
 */
export async function genererMedAi(
  input: ArkatGenerateInput,
  terminologi: UnderenhetTerminologi | null,
  tgData: TgTerminologi | null
): Promise<AiGenereringsResultat> {
  const modus = aiModus();

  // ── AI er av — returner umiddelbart ──
  if (modus === "av") {
    return { bruktAi: false, kilde: null, resultat: null, varsler: [], feil: null };
  }

  // Pass-through felter fra takstmannens input
  const observasjon = input.observasjon.trim();
  const arsak = (input.arsak ?? input.observasjon).trim();

  // ── Mock-modus ──
  if (modus === "mock") {
    const mock = mockArkatResultat();
    return {
      bruktAi: true,
      kilde: "mock",
      resultat: {
        observasjon,
        arsak,
        risiko: mock.risiko,
        konsekvens: mock.konsekvens,
        anbefalt_tiltak: mock.anbefalt_tiltak,
      },
      varsler: mock.varsler,
      feil: null,
    };
  }

  // ── Live API-kall ──
  try {
    const instructions = byggSystemInstruksjoner();
    const brukerInput = byggBrukerInput({ input, terminologi, tgData });

    const aiResultat = await kallResponseApi({
      instructions,
      input: brukerInput,
    });

    // AI returnerer kun R/K/T + varsler. Observasjon og Årsak er pass-through.
    const { varsler, ...rkt } = aiResultat;

    return {
      bruktAi: true,
      kilde: "live",
      resultat: {
        observasjon,
        arsak,
        ...rkt,
      },
      varsler: varsler ?? [],
      feil: null,
    };
  } catch (err) {
    const melding =
      err instanceof Error ? err.message : "Ukjent feil ved AI-generering";
    console.error("ARKAT AI-generering feilet:", melding);

    return {
      bruktAi: false,
      kilde: null,
      resultat: null,
      varsler: [],
      feil: melding,
    };
  }
}
