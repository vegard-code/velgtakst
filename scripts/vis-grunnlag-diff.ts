/**
 * Vis prompt-forskjeller mellom gammel og ny grunnlagsmodell.
 * Kjøres UTEN API-nøkkel — viser bare hva som sendes til AI-en.
 *
 * Bruk: npx tsx scripts/vis-grunnlag-diff.ts
 */
import { byggSystemInstruksjoner, byggBrukerInput } from "../src/features/arkat/lib/ai-prompt";
import type { ArkatGenerateInput } from "../src/features/arkat/types/arkat";
import { hentTerminologi, hentTgTerminologi } from "../src/features/arkat/lib/terminology";

interface TestPar {
  navn: string;
  begrunnelse: string;
  a: { label: string; input: ArkatGenerateInput };
  b: { label: string; input: ArkatGenerateInput };
}

const TESTPAR: TestPar[] = [
  {
    navn: "1. Membran uten dokumentasjon — visuell vs. dokumentasjon + tillegg",
    begrunnelse:
      "Gammel: visuell_observasjon sier ingenting om at grunnlaget er manglende dok.\n" +
      "Ny: hovedgrunnlag=dokumentasjon_mangler + ingen_paavist_skade + alder_som_grunnlag.",
    a: {
      label: "GAMMEL (bare visuell, ingen tillegg)",
      input: {
        bygningsdel: "vatrom",
        underenhet: "membran_tettesjikt",
        tilstandsgrad: "TG2",
        hovedgrunnlag: "visuell_observasjon",
        tillegg: [],
        akuttgrad: "bor_folges_opp",
        observasjon: "Våtrom fra 1998. Ingen synlige fuktskader, men membran er ikke dokumentert.",
        onsket_lengde: "normal",
        ns_versjon: "NS3600_2025",
        aldersvurdering: "brukes_som_grunnlag",
      },
    },
    b: {
      label: "NY (dokumentasjon_mangler + ingen_paavist_skade + alder_som_grunnlag)",
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
  },
  {
    navn: "2. Fukt bak toalett MED undersøkelsesbegrensning",
    begrunnelse:
      "Gammel: visuell_observasjon fanget ikke at det var begrenset tilgang.\n" +
      "Ny: tillegg=undersoekelsesbegrensning gir forbehold i output.",
    a: {
      label: "GAMMEL (bare visuell, ingen tillegg)",
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
      label: "NY (visuell + undersoekelsesbegrensning)",
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
    navn: "3. Isolerglass alder — bare alder vs. alder + ingen_paavist_skade",
    begrunnelse:
      "Gammel: alder_slitasje som eneste signal. AI vet ikke at det er ingen symptomer.\n" +
      "Ny: tillegg=ingen_paavist_skade demper språket merkbart.",
    a: {
      label: "GAMMEL (bare alder_slitasje, ingen tillegg)",
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
      label: "NY (alder_slitasje + ingen_paavist_skade + alder_som_grunnlag)",
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
    navn: "4. Drenering — visuell (feil) vs. maaling_indikasjon (riktig)",
    begrunnelse:
      "Gammel: visuell_observasjon er feil — grunnlaget er en fuktmåling.\n" +
      "Ny: hovedgrunnlag=maaling_indikasjon + alder_som_grunnlag gir riktig kontekst.",
    a: {
      label: "GAMMEL (visuell — men grunnlaget er en måling!)",
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
      label: "NY (maaling_indikasjon + alder_som_grunnlag)",
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
    navn: "5. Tak fra bakkenivå — visuell vs. visuell + undersøkelsesbegrensning",
    begrunnelse:
      "Gammel: kan ikke uttrykke at inspeksjonen var begrenset.\n" +
      "Ny: tillegg=undersoekelsesbegrensning gir varsel og forsiktigere tekst.",
    a: {
      label: "GAMMEL (visuell, ingen tillegg)",
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
      label: "NY (visuell + undersoekelsesbegrensning)",
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

// ─── Vis ──────────────────────────────────────────────────────

function visPayload(input: ArkatGenerateInput): string {
  return JSON.stringify({
    hovedgrunnlag: input.hovedgrunnlag,
    tillegg: input.tillegg,
    tilstandsgrad: input.tilstandsgrad,
    akuttgrad: input.akuttgrad,
    ns_versjon: input.ns_versjon,
    aldersvurdering: input.aldersvurdering ?? "N/A",
  }, null, 2);
}

function main() {
  const systemInstruksjoner = byggSystemInstruksjoner();

  // Vis systeminstruksjoner regel 10 (den nye regelen)
  const regel10Start = systemInstruksjoner.indexOf("10. HOVEDGRUNNLAG OG TILLEGG");
  const regel10Slutt = systemInstruksjoner.indexOf("SVAR-FORMAT:");
  console.log("═".repeat(70));
  console.log("SYSTEMINSTRUKSJONER — ny regel 10:");
  console.log("═".repeat(70));
  console.log(systemInstruksjoner.slice(regel10Start, regel10Slutt).trim());
  console.log();

  for (const par of TESTPAR) {
    console.log("═".repeat(70));
    console.log(par.navn);
    console.log(`Begrunnelse: ${par.begrunnelse}`);
    console.log("═".repeat(70));

    for (const variant of [par.a, par.b]) {
      const { input } = variant;
      const terminologi = hentTerminologi(input.bygningsdel, input.underenhet);
      const tgData = hentTgTerminologi(input.bygningsdel, input.underenhet, input.tilstandsgrad);
      const brukerInput = byggBrukerInput({ input, terminologi, tgData });

      console.log();
      console.log(`--- ${variant.label} ---`);
      console.log();
      console.log("PAYLOAD (metadata-del):");
      console.log(visPayload(input));
      console.log();

      // Vis bare METADATA + ALDERSVURDERING-delen av brukerinput
      const metadataMatch = brukerInput.match(/METADATA:[\s\S]*?(?=\n\n)/);
      const alderMatch = brukerInput.match(/ALDERSVURDERING:[\s\S]*?(?=\n\n)/);
      const alderslogikkMatch = brukerInput.match(/ALDERSLOGIKK[\s\S]*?(?=\n\n)/);

      console.log("PROMPT → METADATA-seksjon:");
      if (metadataMatch) console.log(metadataMatch[0]);
      console.log();
      if (alderMatch) {
        console.log("PROMPT → ALDERSVURDERING-seksjon:");
        console.log(alderMatch[0]);
        console.log();
      }
      if (alderslogikkMatch) {
        console.log("PROMPT → ALDERSLOGIKK-seksjon:");
        console.log(alderslogikkMatch[0]);
        console.log();
      }
    }

    console.log();
  }
}

main();
