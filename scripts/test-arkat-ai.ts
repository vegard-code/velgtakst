/**
 * Testskript v2 for ARKAT AI-generering.
 * Kjør med: npx tsx scripts/test-arkat-ai.ts
 *
 * Fokus: Grensetilfeller, vage observasjoner, alder uten symptomer,
 * lokale avvik som IKKE skal gi full rehabilitering.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { byggSystemInstruksjoner, byggBrukerInput } from "../src/features/arkat/lib/ai-prompt";
import { kallResponseApi } from "../src/features/arkat/lib/openai-client";
import type { ArkatGenerateInput } from "../src/features/arkat/types/arkat";
import { hentTerminologi, hentTgTerminologi } from "../src/features/arkat/lib/terminology";

// ─── Testcaser — fokus på forholdsmessighet ────────────────

const TESTCASER: { navn: string; forventet: string; input: ArkatGenerateInput }[] = [
  {
    navn: "1. VAG: Svake fuktindikasjoner bak toalett (TG2) + dokumentasjon mangler",
    forventet: "Konsekvens: videre undersøkelse, IKKE full rehabilitering. Varsel bør utløses.",
    input: {
      bygningsdel: "vatrom",
      underenhet: "membran_tettesjikt",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "visuell_observasjon",
      tillegg: ["dokumentasjon_mangler"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Svake fuktindikasjoner ved overgang mellom gulv og vegg bak toalett. Membran er ikke dokumentert.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2018",
    },
  },
  {
    navn: "2. ALDER UTEN SYMPTOMER: Våtrom fra 1998, ingen fukt (NS 3600:2025)",
    forventet: "Forsiktig risiko. Tiltak: avklare tilstand, IKKE rehabilitering. Varsel bør utløses.",
    input: {
      bygningsdel: "vatrom",
      underenhet: "membran_tettesjikt",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "alder_slitasje",
      tillegg: ["ingen_paavist_skade", "alder_som_grunnlag", "dokumentasjon_mangler"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Våtrom fra 1998. Ingen synlige fuktskader, men membran er ikke dokumentert og alder tilsier begrenset gjenværende levetid.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2025",
      aldersvurdering: "brukes_som_grunnlag",
    },
  },
  {
    navn: "3. LOKAL SKADE: Sprukken flis ved dusj, ellers OK (TG2)",
    forventet: "Konsekvens: lokal utbedring av flis. IKKE full rehabilitering av våtrom.",
    input: {
      bygningsdel: "vatrom",
      underenhet: "membran_tettesjikt",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "visuell_observasjon",
      tillegg: [],
      akuttgrad: "bor_folges_opp",
      observasjon: "En sprukken flis ved dusjsone. Fugen rundt er intakt. Ingen fuktindikasjoner målt med fuktmåler.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2018",
    },
  },
  {
    navn: "4. ALDER UTEN SYMPTOMER: Isolerglass fra 1988, ingen dugg (NS 3600:2025)",
    forventet: "Alder som faktor, men IKKE 'rutene må skiftes'. Tiltak: vurdering/oppfølging.",
    input: {
      bygningsdel: "vinduer_og_utvendige_dorer",
      underenhet: "vinduer",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "alder_slitasje",
      tillegg: ["ingen_paavist_skade", "alder_som_grunnlag"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Opprinnelige isolerglassruter fra 1988. Ingen synlig dugg mellom glassene, men rutene er over 35 år gamle.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2025",
      aldersvurdering: "brukes_som_grunnlag",
    },
  },
  {
    navn: "5. VAG: 'Noe fukt' i kjeller, ingen konkret plassering",
    forventet: "Varsel om vag observasjon. Tiltak: videre undersøkelse for å avklare omfang.",
    input: {
      bygningsdel: "grunn_og_fundamenter",
      underenhet: "fuktsikring_og_drenering",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "visuell_observasjon",
      tillegg: [],
      akuttgrad: "bor_folges_opp",
      observasjon: "Noe fukt registrert i kjeller. Kilde ikke fastslått.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2018",
    },
  },
  {
    navn: "6. ALDER UTEN SYMPTOMER: Drenering fra 1985, ingen fukt observert",
    forventet: "Forsiktig språk. Tiltak: inspeksjon/TV-kontroll, IKKE utskifting.",
    input: {
      bygningsdel: "grunn_og_fundamenter",
      underenhet: "fuktsikring_og_drenering",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "alder_slitasje",
      tillegg: ["ingen_paavist_skade", "alder_som_grunnlag"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Drenering er fra byggeår 1985. Ingen synlig fukt på grunnmur. Dreneringen er ikke inspisert.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2025",
      aldersvurdering: "brukes_som_grunnlag",
    },
  },
  {
    navn: "7. LOKAL + VAG: Misfarging på tak, usikkert omfang + undersøkelsesbegrensning",
    forventet: "Varsel om usikkert omfang. Tiltak: nærmere inspeksjon.",
    input: {
      bygningsdel: "tak",
      underenhet: "taktekking",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "visuell_observasjon",
      tillegg: ["undersoekelsesbegrensning"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Noe misfarging observert på takstein i nordvendt takflate. Omfang ikke fastslått fra bakkenivå.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2018",
    },
  },
  {
    navn: "8. ALDER+DOK UTEN ALDERSVURDERING: Våtrom 1998, NS 3600:2018",
    forventet: "Enda mer forsiktig enn case 2 — ingen aldersvurdering aktivert.",
    input: {
      bygningsdel: "vatrom",
      underenhet: "membran_tettesjikt",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "dokumentasjon_mangler",
      tillegg: ["ingen_paavist_skade"],
      akuttgrad: "bor_folges_opp",
      observasjon: "Våtrom fra 1998. Ingen synlige fuktskader. Membran er ikke dokumentert.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2018",
    },
  },
  {
    navn: "9. KONTROLL: TG3 med faktisk alvorlig skade (bør IKKE utløse varsel)",
    forventet: "Sterk risiko, konkret tiltak. Ingen varsel — observasjonen er tydelig.",
    input: {
      bygningsdel: "tak",
      underenhet: "taktekking",
      tilstandsgrad: "TG3",
      hovedgrunnlag: "visuell_observasjon",
      tillegg: [],
      akuttgrad: "haster",
      observasjon: "Flere takstein er forskjøvet og knekt. Synlig dagslys gjennom taktekking fra loft. Fuktskader på undertak.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2018",
    },
  },
  {
    navn: "10. LOKAL: Noe mose på tak, ellers ok",
    forventet: "Tiltak: mosebehandling/rengjøring. IKKE omtekking.",
    input: {
      bygningsdel: "tak",
      underenhet: "taktekking",
      tilstandsgrad: "TG2",
      hovedgrunnlag: "visuell_observasjon",
      tillegg: [],
      akuttgrad: "bor_folges_opp",
      observasjon: "Mose-/algevekst på nordvendt takflate. Takstein forøvrig intakt og uten forskyvninger.",
      onsket_lengde: "normal",
      ns_versjon: "NS3600_2018",
    },
  },
];

// ─── Kjør tester ───────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY mangler i .env.local");
    process.exit(1);
  }
  console.log("🔑 API-nøkkel funnet. Kjører 10 testcaser (fokus: forholdsmessighet)...\n");

  const instructions = byggSystemInstruksjoner();

  for (const tc of TESTCASER) {
    console.log(`${"═".repeat(70)}`);
    console.log(`📋 ${tc.navn}`);
    console.log(`   Observasjon: "${tc.input.observasjon}"`);
    console.log(`   TG: ${tc.input.tilstandsgrad} | NS: ${tc.input.ns_versjon} | Alder: ${tc.input.aldersvurdering ?? "N/A"}`);
    console.log(`   Hovedgrunnlag: ${tc.input.hovedgrunnlag} | Tillegg: ${tc.input.tillegg.length > 0 ? tc.input.tillegg.join(", ") : "ingen"}`);
    console.log(`   🎯 Forventet: ${tc.forventet}`);
    console.log();

    const terminologi = hentTerminologi(tc.input.bygningsdel, tc.input.underenhet);
    const tgData = hentTgTerminologi(tc.input.bygningsdel, tc.input.underenhet, tc.input.tilstandsgrad);
    const brukerInput = byggBrukerInput({ input: tc.input, terminologi, tgData });

    const start = Date.now();
    try {
      const resultat = await kallResponseApi({ instructions, input: brukerInput });
      const tid = Date.now() - start;

      console.log(`✅ Svar (${tid}ms):`);
      console.log(`   Årsak:      ${resultat.arsak}`);
      console.log(`   Risiko:     ${resultat.risiko}`);
      console.log(`   Konsekvens: ${resultat.konsekvens}`);
      console.log(`   Tiltak:     ${resultat.anbefalt_tiltak}`);
      if (resultat.varsler.length > 0) {
        console.log(`   ⚠️  Varsler:`);
        for (const v of resultat.varsler) {
          console.log(`       - ${v}`);
        }
      } else {
        console.log(`   ✓ Ingen varsler`);
      }
    } catch (err) {
      const tid = Date.now() - start;
      console.log(`❌ Feilet (${tid}ms): ${err instanceof Error ? err.message : err}`);
    }
    console.log();
  }
}

main();
