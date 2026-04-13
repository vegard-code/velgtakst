/**
 * Auto-inferens av hovedgrunnlag og tillegg fra observasjonstekst.
 *
 * Brukes i UI for å sette smarte defaults slik at takstmannen
 * slipper å velge manuelt hver gang. Backend-modellen er uendret.
 *
 * Logikk:
 * - Scanner observasjonen mot kjente mønstre
 * - Returnerer foreslått hovedgrunnlag + tillegg
 * - Returnerer også en confidence-score slik at UI kan vise
 *   "automatisk" vs "velg manuelt" tilstand
 */
import type { Hovedgrunnlag, ObservasjonsTillegg } from "../types/arkat";

export interface InferertGrunnlag {
  hovedgrunnlag: Hovedgrunnlag | null;
  tillegg: ObservasjonsTillegg[];
  /** Hvor sikker inferensen er: "hoy" = tydelig match, "lav" = gjetning */
  confidence: "hoy" | "lav";
}

// ─── Mønster-sett ──────────────────────────────────────────

/** Mønstre som indikerer måling/indikasjon som hovedgrunnlag */
const MAALING_MONSTRE = [
  /fuktmåling/i,
  /måling\s*(viser|gir|indikerer|på)/i,
  /\d+\s*%/,  // prosentverdi (f.eks. "28%")
  /indika(sjon|tor)/i,
  /termografi/i,
  /punktert/i,
  /temperaturforskjell/i,
  /varmekamera/i,
  /duggmåler/i,
  /fuktindikator/i,
];

/** Mønstre som indikerer alder/slitasje som hovedgrunnlag */
const ALDER_MONSTRE = [
  /fra\s*(19|20)\d{2}/i,        // "fra 1982"
  /bygge?år\s*(19|20)\d{2}/i,   // "byggeår 1978"
  /\d+\s*år\s*(gamm|gml)/i,     // "40 år gammel"
  /opprinnelig\s*fra/i,
  /ikke\s*(skiftet|byttet|erstattet|fornyet|rehabilitert)/i,
  /forventet\s*levetid/i,
  /levetid\s*(utløpt|overskredet|passert)/i,
  /over\s*forventet/i,
  /utdatert/i,
  /antatt\s*alder/i,
  /normal\s*levetid/i,
  /eldre\s*type/i,
  /slitasje\s*(på|i|av)/i,
  /generell\s*slitasje/i,
  /aldersrelatert/i,
];

/** Mønstre som indikerer dokumentasjon mangler som hovedgrunnlag */
const DOK_MONSTRE = [
  /mangler?\s*(samsvar|dokument|fdk|attest|sertifikat)/i,
  /ingen\s*(dokument|samsvar|fdk)/i,
  /ikke\s*(dokumentert|fremlagt|fremvist|mottatt)/i,
  /dokumentasjon\s*(mangler|foreligger\s*ikke|ikke)/i,
  /samsvarserklæring/i,
  /ferdigattest/i,
  /fdk/i,
];

/** Mønstre som indikerer visuell observasjon (catch-all, men med tydelige markører) */
const VISUELL_MONSTRE = [
  /observert/i,
  /registrert/i,
  /synlig(e)?\s*(skad|sprekk|riss|fukt|misfarging|avflassing)/i,
  /visuell/i,
  /kan\s*ses/i,
  /konstatert/i,
  /påvist/i,
  /sprekk/i,
  /riss\b/i,
  /avflassing/i,
  /avskalling/i,
  /misfarging/i,
  /lekkasje/i,
  /fuktmerke/i,
  /vannmerke/i,
  /mugg/i,
  /sopp/i,
  /råte/i,
  /korrosjon/i,
  /deformasjon/i,
  /bøy(ning)?/i,
  /setning(er)?/i,
];

// ─── Tillegg-mønstre ───────────────────────────────────────

/** Mønstre som indikerer undersøkelsesbegrensning */
const BEGRENSNING_MONSTRE = [
  /ikke\s*(tilgjengelig|mulig\s*å|adgang|synlig)/i,
  /begrenset\s*(tilgang|innsyn|sikt)/i,
  /skjult\s*(bak|av|under)/i,
  /tildekket/i,
  /utilgjengelig/i,
  /kunne\s*ikke\s*(inspiseres|undersøkes|kontrolleres)/i,
  /bak\s*(innredning|kledning|panel)/i,
  /under\s*(gulv|belegg)/i,
];

/** Mønstre som indikerer "ingen påvist skade" */
const INGEN_SKADE_MONSTRE = [
  /ingen\s*(synlig|påvist|registrert)(e)?\s*(skad|tegn|fukt|lekkasj)/i,
  /ikke\s*(påvist|observert|registrert)\s*(skad|fukt|lekkasj)/i,
  /uten\s*(synlig|påvist)(e)?\s*(skad|tegn)/i,
  /fremstår\s*(intakt|tett|hel|tilfredsstillende)/i,
  /ingen\s*tegn\s*til/i,
  /ser\s*ut\s*til\s*å\s*fungere/i,
];

/** Mønstre som indikerer alder som tilleggsgrunnlag (ikke hovedgrunnlag) */
const ALDER_TILLEGG_MONSTRE = [
  /alder\s*(tatt|tas|brukt|vurdert)\s*(i\s*betraktning|som|hensyn)/i,
  /hensyn\s*til\s*alder/i,
  /tatt\s*alder/i,
  /gitt\s*alder/i,
  /med\s*tanke\s*på\s*alder/i,
  /alder\s*tilsier/i,
];

/** Mønstre som indikerer dok.mangler som tillegg (i kombinasjon med annet) */
const DOK_TILLEGG_MONSTRE = [
  /i\s*tillegg\s*(mangler|foreligger\s*ikke|er\s*det\s*ikke)/i,
  /heller\s*ikke\s*(dokumentert|fremlagt)/i,
  /videre\s*mangler/i,
];

// ─── Hovedfunksjon ─────────────────────────────────────────

export function inferGrunnlag(observasjon: string): InferertGrunnlag {
  const obs = observasjon.trim();
  if (obs.length < 15) {
    return { hovedgrunnlag: null, tillegg: [], confidence: "lav" };
  }

  // Tell matches per kategori
  const maalingScore = tellMatches(obs, MAALING_MONSTRE);
  const alderScore = tellMatches(obs, ALDER_MONSTRE);
  const dokScore = tellMatches(obs, DOK_MONSTRE);
  const visuellScore = tellMatches(obs, VISUELL_MONSTRE);

  // Bestem hovedgrunnlag — den med flest treff vinner
  type Kandidat = { grunnlag: Hovedgrunnlag; score: number };
  const kandidater: Kandidat[] = [
    { grunnlag: "maaling_indikasjon", score: maalingScore },
    { grunnlag: "alder_slitasje", score: alderScore },
    { grunnlag: "dokumentasjon_mangler", score: dokScore },
    { grunnlag: "visuell_observasjon", score: visuellScore },
  ];

  // Sorter synkende — høyest score først
  kandidater.sort((a, b) => b.score - a.score);

  let hovedgrunnlag: Hovedgrunnlag | null = null;
  let confidence: "hoy" | "lav" = "lav";

  if (kandidater[0].score >= 2) {
    hovedgrunnlag = kandidater[0].grunnlag;
    // Høy confidence hvis tydelig ledelse (minst 2 poeng foran nestbeste)
    confidence = kandidater[0].score >= kandidater[1].score + 2 ? "hoy" : "lav";
  } else if (kandidater[0].score === 1) {
    hovedgrunnlag = kandidater[0].grunnlag;
    confidence = "lav";
  }

  // Bestem tillegg
  const tillegg: ObservasjonsTillegg[] = [];

  if (tellMatches(obs, BEGRENSNING_MONSTRE) > 0) {
    tillegg.push("undersoekelsesbegrensning");
  }

  if (tellMatches(obs, INGEN_SKADE_MONSTRE) > 0) {
    tillegg.push("ingen_paavist_skade");
  }

  // Alder som tillegg: kun hvis alder ikke allerede er hovedgrunnlag
  if (hovedgrunnlag !== "alder_slitasje") {
    if (tellMatches(obs, ALDER_TILLEGG_MONSTRE) > 0 || (alderScore > 0 && maalingScore > 0)) {
      tillegg.push("alder_som_grunnlag");
    }
  }

  // Dok.mangler som tillegg: kun hvis dok ikke allerede er hovedgrunnlag
  if (hovedgrunnlag !== "dokumentasjon_mangler") {
    if (tellMatches(obs, DOK_TILLEGG_MONSTRE) > 0 || (dokScore > 0 && (visuellScore > 0 || maalingScore > 0))) {
      tillegg.push("dokumentasjon_mangler");
    }
  }

  return { hovedgrunnlag, tillegg, confidence };
}

// ─── Hjelpefunksjoner ──────────────────────────────────────

function tellMatches(tekst: string, monstre: RegExp[]): number {
  return monstre.filter((m) => m.test(tekst)).length;
}
