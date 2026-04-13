/**
 * Testskript: Hovedgrunnlag + Tillegg vs. gammel observasjonstype.
 * Viser 5 case-par der den nye strukturen gir bedre output.
 *
 * Kjør med: npx tsx scripts/test-arkat-grunnlag.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { byggSystemInstruksjoner, byggBrukerInput } from "../src/features/arkat/lib/ai-prompt";
import { kallResponseApi } from "../src/features/arkat/lib/openai-client";
import type { ArkatGenerateInput } from "../src/features/arkat/types/arkat";
import { hentTerminologi, hentTgTerminologi } from "../src/features/arkat/lib/terminology";

// ─── 5 case-par: samme observasjon, forskjellig hovedgrunnlag/tillegg ──

interface TestPar {
  navn: string;
  begrunnelse: string;
  /** Variant A: bred/grov — slik det var med ett observasjonstype-felt */
  a: { label: string; input: ArkatGenerateInput };
  /** Variant B: nyansert — hovedgrunnlag + tillegg */
  b: { label: string; input: ArkatGenerateInput };
}

const BASE_VATROM: Omit<ArkatGenerateInput, "hovedgrunnlag" | "tillegg"> = {
  bygningsdel: "vatrom",
  underenhet: "membran_tettesjikt",
  tilstandsgrad: "TG2",
  akuttgrad: "bor_folges_opp",
  observasjon: "Våtrom fra 1998. Ingen synlige fuktskader, men membran er ikke dokumentert.",
  onsket_lengde: "normal",
  ns_versjon: "NS3600_2025",
  aldersvurdering: "brukes_som_grunnlag",
};

const TESTPAR: TestPar[] = [
  {
    navn: "1. Membran uten dokumentasjon — visuell vs. dokumentasjon + tillegg",
    begrunnelse:
      "Gammel modell: visuell_observasjon sier ingenting om at grunnlaget er manglende dokumentasjon.\n" +
      "Ny modell: hovedgrunnlag=dokumentasjon_mangler + tillegg=ingen_paavist_skade gir AI-en presis kontekst.",
    a: {
      label: "Gammel: hovedgrunnlag=visuell_observasjon, ingen tillegg",
      input: { ...BASE_VATROM, hovedgrunnlag: "visuell_observasjon", tillegg: [] },
    },
    b: {
      label: "Ny: hovedgrunnlag=dokumentasjon_mangler + ingen_paavist_skade, alder_som_grunnlag",
      input: {
        ...BASE_VATROM,
        hovedgrunnlag: "dokumentasjon_mangler",
        tillegg: ["ingen_paavist_skade", "alder_som_grunnlag"],
      },
    },
  },
  {
    navn: "2. Fukt bak toalett MED undersøkelsesbegrensning",
    begrunnelse:
      "Gammel modell: visuell_observasjon fanget ikke at det var begrenset tilgang.\n" +
      "Ny modell: tillegg=undersoekelsesbegrensning gir forbehold i output.",
    a: {
      label: "Gammel: hovedgrunnlag=visuell_observasjon, ingen tillegg",
      input: {
        bygningsdel: "vatrom",
        underenhet: "membran_tettesjikt",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "visuell_observasjon",
        tillegg: [],
        akuttgrad: "bor_folges_opp",
        observasjon: "Svake fuktindikasjoner ved gulv/vegg-overgang bak toalett. Begrenset tilgang til inspeksjon.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2018",
      },
    },
    b: {
      label: "Ny: hovedgrunnlag=visuell_observasjon + undersoekelsesbegrensning",
      input: {
        bygningsdel: "vatrom",
        underenhet: "membran_tettesjikt",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "visuell_observasjon",
        tillegg: ["undersoekelsesbegrensning"],
        akuttgrad: "bor_folges_opp",
        observasjon: "Svake fuktindikasjoner ved gulv/vegg-overgang bak toalett. Begrenset tilgang til inspeksjon.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2018",
      },
    },
  },
  {
    navn: "3. Isolerglass — alder uten symptomer, målt vs. alder+ingen_skade",
    begrunnelse:
      "Gammel modell: alder_slitasje som observasjonstype ga samme output uansett om det var målt eller ikke.\n" +
      "Ny modell: hovedgrunnlag=alder_slitasje + ingen_paavist_skade demper språket merkbart.",
    a: {
      label: "Gammel: hovedgrunnlag=alder_slitasje, ingen tillegg",
      input: {
        bygningsdel: "vinduer_og_utvendige_dorer",
        underenhet: "vinduer",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "alder_slitasje",
        tillegg: [],
        akuttgrad: "bor_folges_opp",
        observasjon: "Opprinnelige isolerglassruter fra 1988. Ingen synlig dugg mellom glassene.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2025",
        aldersvurdering: "brukes_som_grunnlag",
      },
    },
    b: {
      label: "Ny: hovedgrunnlag=alder_slitasje + ingen_paavist_skade, alder_som_grunnlag",
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
  },
  {
    navn: "4. Drenering — måling som hovedgrunnlag vs. visuell",
    begrunnelse:
      "Gammel modell: observasjonstype=visuell er feil når grunnlaget er en TV-kontroll/måling.\n" +
      "Ny modell: hovedgrunnlag=maaling_indikasjon gir mer presis risikotekst.",
    a: {
      label: "Gammel: hovedgrunnlag=visuell_observasjon (feil — dette er en måling)",
      input: {
        bygningsdel: "grunn_og_fundamenter",
        underenhet: "fuktsikring_og_drenering",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "visuell_observasjon",
        tillegg: [],
        akuttgrad: "bor_folges_opp",
        observasjon: "Fuktmåling viser forhøyede verdier i nedre del av grunnmur mot nordvest. Drenering fra 1990.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2018",
      },
    },
    b: {
      label: "Ny: hovedgrunnlag=maaling_indikasjon + alder_som_grunnlag",
      input: {
        bygningsdel: "grunn_og_fundamenter",
        underenhet: "fuktsikring_og_drenering",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "maaling_indikasjon",
        tillegg: ["alder_som_grunnlag"],
        akuttgrad: "bor_folges_opp",
        observasjon: "Fuktmåling viser forhøyede verdier i nedre del av grunnmur mot nordvest. Drenering fra 1990.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2018",
      },
    },
  },
  {
    navn: "5. Tak — visuell observasjon med undersøkelsesbegrensning vs. uten",
    begrunnelse:
      "Gammel modell: kan ikke uttrykke at inspeksjonen er gjort fra bakkenivå.\n" +
      "Ny modell: tillegg=undersoekelsesbegrensning gir varsel og forsiktigere konklusjoner.",
    a: {
      label: "Gammel: hovedgrunnlag=visuell_observasjon, ingen tillegg",
      input: {
        bygningsdel: "tak",
        underenhet: "taktekking",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "visuell_observasjon",
        tillegg: [],
        akuttgrad: "bor_folges_opp",
        observasjon: "Mose/begroing observert på nordvendt takflate. Inspeksjon fra bakkenivå, detaljer ikke fastslått.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2018",
      },
    },
    b: {
      label: "Ny: hovedgrunnlag=visuell_observasjon + undersoekelsesbegrensning",
      input: {
        bygningsdel: "tak",
        underenhet: "taktekking",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "visuell_observasjon",
        tillegg: ["undersoekelsesbegrensning"],
        akuttgrad: "bor_folges_opp",
        observasjon: "Mose/begroing observert på nordvendt takflate. Inspeksjon fra bakkenivå, detaljer ikke fastslått.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2018",
      },
    },
  },
];

// ─── Kjør ────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY mangler i .env.local");
    process.exit(1);
  }
  console.log("Kjører 5 testpar: gammel vs. ny grunnlagsmodell\n");

  const instructions = byggSystemInstruksjoner();

  for (const par of TESTPAR) {
    console.log(`${"═".repeat(70)}`);
    console.log(`${par.navn}`);
    console.log(`Begrunnelse: ${par.begrunnelse}`);
    console.log();

    for (const variant of [par.a, par.b]) {
      console.log(`  --- ${variant.label} ---`);

      const terminologi = hentTerminologi(variant.input.bygningsdel, variant.input.underenhet);
      const tgData = hentTgTerminologi(variant.input.bygningsdel, variant.input.underenhet, variant.input.tilstandsgrad);
      const brukerInput = byggBrukerInput({ input: variant.input, terminologi, tgData });

      const start = Date.now();
      try {
        const resultat = await kallResponseApi({ instructions, input: brukerInput });
        const tid = Date.now() - start;

        console.log(`  [${tid}ms]`);
        console.log(`  Arsak:      ${resultat.arsak}`);
        console.log(`  Risiko:     ${resultat.risiko}`);
        console.log(`  Konsekvens: ${resultat.konsekvens}`);
        console.log(`  Tiltak:     ${resultat.anbefalt_tiltak}`);
        if (resultat.varsler.length > 0) {
          console.log(`  Varsler:`);
          for (const v of resultat.varsler) {
            console.log(`    - ${v}`);
          }
        }
      } catch (err) {
        console.log(`  FEIL: ${err instanceof Error ? err.message : err}`);
      }
      console.log();
    }
  }
}

main();
