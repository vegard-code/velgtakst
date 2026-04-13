/**
 * Retestt: Bare testpar 1 og 3 med forsterket prompt.
 * Kjør: npx tsx scripts/test-grunnlag-retest.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { byggSystemInstruksjoner, byggBrukerInput } from "../src/features/arkat/lib/ai-prompt";
import { kallResponseApi } from "../src/features/arkat/lib/openai-client";
import type { ArkatGenerateInput } from "../src/features/arkat/types/arkat";
import { hentTerminologi, hentTgTerminologi } from "../src/features/arkat/lib/terminology";

interface TestCase {
  navn: string;
  input: ArkatGenerateInput;
}

const TESTER: TestCase[] = [
  {
    navn: "1B-retest. Membran dok mangler + ingen_paavist_skade + alder_som_grunnlag",
    input: {
      bygningsdel: "vatrom",
      underenhet: "membran_tettesjikt",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "dokumentasjon_mangler",
      tillegg: ["ingen_paavist_skade", "alder_som_grunnlag"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Våtrom fra 1998. Ingen synlige fuktskader, men membran er ikke dokumentert.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2025",
      aldersvurdering: "brukes_som_grunnlag",
    },
  },
  {
    navn: "3B-retest. Isolerglass alder + ingen_paavist_skade + alder_som_grunnlag",
    input: {
      bygningsdel: "vinduer_og_utvendige_dorer",
      underenhet: "vinduer",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "alder_slitasje",
      tillegg: ["ingen_paavist_skade", "alder_som_grunnlag"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Opprinnelige isolerglassruter fra 1988. Ingen synlig dugg mellom glassene.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2025",
      aldersvurdering: "brukes_som_grunnlag",
    },
  },
];

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY mangler");
    process.exit(1);
  }
  console.log("Retest: testpar 1B og 3B med forsterket ingen_paavist_skade-regel\n");

  const instructions = byggSystemInstruksjoner();

  for (const tc of TESTER) {
    console.log(`${"═".repeat(70)}`);
    console.log(tc.navn);
    console.log(`Hovedgrunnlag: ${tc.input.hovedgrunnlag} | Tillegg: ${tc.input.tillegg.join(", ")}`);
    console.log();

    const terminologi = hentTerminologi(tc.input.bygningsdel, tc.input.underenhet);
    const tgData = hentTgTerminologi(tc.input.bygningsdel, tc.input.underenhet, tc.input.tilstandsgrad);
    const brukerInput = byggBrukerInput({ input: tc.input, terminologi, tgData });

    const start = Date.now();
    try {
      const resultat = await kallResponseApi({ instructions, input: brukerInput });
      const tid = Date.now() - start;
      console.log(`[${tid}ms]`);
      console.log(`Arsak:      ${resultat.arsak}`);
      console.log(`Risiko:     ${resultat.risiko}`);
      console.log(`Konsekvens: ${resultat.konsekvens}`);
      console.log(`Tiltak:     ${resultat.anbefalt_tiltak}`);
      if (resultat.varsler.length > 0) {
        console.log(`Varsler:`);
        for (const v of resultat.varsler) console.log(`  - ${v}`);
      }
    } catch (err) {
      console.log(`FEIL: ${err instanceof Error ? err.message : err}`);
    }
    console.log();
  }
}

main();
