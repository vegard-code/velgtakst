/**
 * Konfigurasjon for NS 3600-versjoner og alderslogikk.
 *
 * NS 3600:2025, punkt 12.4 og tillegg C, introduserer at alder /
 * usikker fremtidig funksjon kan brukes som del av grunnlaget for
 * TG-vurdering på utvalgte underenheter.
 *
 * VIKTIG SKILLE:
 * - `aldersterskelAar`:  Konkret terskelverdi fra NS 3600:2025 / tillegg C.
 *                        Brukes i logikk. Skal gjenspeile standarden nøyaktig.
 *                        null = standarden angir ingen spesifikk terskel.
 *
 * - `hjelpetekst`:       Forklarende tekst for takstmannen i UI.
 *                        Skal IKKE inneholde tall som kan forveksles med
 *                        standardens krav — med mindre de siterer standarden.
 *
 * VIKTIG: Alderslogikken styrer IKKE TG automatisk.
 * Takstmannen velger alltid TG selv. Denne informasjonen brukes
 * til å justere språkstyrke og kontekst i genereringen.
 *
 * Bygget for å kunne kobles tettere til rapport/befaringstidspunkt
 * i en fremtidig versjon (f.eks. befaringsdato + byggeår → beregnet alder).
 */
import type { NsVersjon } from "../types/arkat";

// ─── Underenheter med alderslogikk i NS 3600:2025 ─────────

export interface AlderslogikkConfig {
  /** Bygningsdel-key fra bygningsdeler.ts */
  bygningsdel: string;
  /** Underenhet-key fra bygningsdeler.ts */
  underenhet: string;
  /** Lesbar label for UI */
  label: string;
  /**
   * Referanse til punkt i NS 3600:2025 som hjemler alderslogikk.
   * F.eks. "12.4", "Tillegg C" eller begge.
   */
  standardreferanse: string;
  /**
   * Aldersterskel i år fra NS 3600:2025 / tillegg C.
   * Dette er standardens konkrete kriterium — IKKE et omtrentlig tall.
   * null = standarden definerer ingen spesifikk aldersterskel
   * (f.eks. undertak, membran — vurderes individuelt).
   *
   * For underenheter med differensiert terskel (f.eks. drenering
   * avhengig av periode), bruk `alderstersklerDifferensiert`.
   */
  aldersterskelAar: number | null;
  /**
   * Differensierte aldersterskler når standarden har ulike kriterier
   * basert på installasjonperiode, materiale e.l.
   * undefined = kun én terskel (bruk aldersterskelAar).
   */
  alderstersklerDifferensiert?: {
    betingelse: string;
    terskelAar: number;
  }[];
  /**
   * Kort hjelpetekst for takstmannen i UI.
   * Skal forklare HVORFOR alder er relevant — ikke oppgi tall
   * med mindre de er direkte fra standarden.
   */
  hjelpetekst: string;
}

/**
 * Underenheter der NS 3600:2025 (punkt 12.4 / tillegg C) tillater
 * alder / usikker fremtidig funksjon som del av grunnlaget for
 * TG-vurdering.
 *
 * Rekkefølge: sortert etter bygningsdel-rekkefølge i NS 3600.
 */
export const ALDERSLOGIKK_UNDERENHETER: AlderslogikkConfig[] = [
  {
    bygningsdel: "grunn_og_fundamenter",
    underenhet: "fuktsikring_og_drenering",
    label: "Fuktsikring og drenering",
    standardreferanse: "12.4 / Tillegg C",
    // Differensiert terskel: standarden har 25 år (eldre) og 30 år (nyere).
    // I v1 samler vi ikke inn installasjonperiode, så terskelen brukes
    // ikke automatisk i logikken. Vises kun som veiledning i UI.
    // Når befaringsdato + byggeår kobles inn (v2), kan dette automatiseres.
    aldersterskelAar: null,
    alderstersklerDifferensiert: [
      {
        betingelse: "Dreneringssystemer fra før ca. 1990",
        terskelAar: 25,
      },
      {
        betingelse: "Dreneringssystemer etter dagens anbefalinger",
        terskelAar: 30,
      },
    ],
    hjelpetekst:
      "Dreneringssystemer har begrenset levetid. Standarden skiller mellom eldre systemer (fra før ca. 1990, terskel 25 år) og nyere systemer (terskel 30 år). Tersklene vises her som veiledning — systemet skiller ikke automatisk mellom periodene.",
  },
  {
    bygningsdel: "vinduer_og_utvendige_dorer",
    underenhet: "vinduer",
    label: "Isolerglassruter",
    standardreferanse: "12.4 / Tillegg C",
    aldersterskelAar: 35,
    hjelpetekst:
      "Isolerglass eldre enn 35 år kan ha redusert isolasjonsevne uten synlige symptomer. Alder er et selvstendig vurderingskriterium per NS 3600:2025.",
  },
  {
    bygningsdel: "tak",
    underenhet: "taktekking",
    label: "Taktekking / vanntett sjikt",
    standardreferanse: "12.4 / Tillegg C",
    aldersterskelAar: 30,
    hjelpetekst:
      "Gjelder det vanntette sjiktet (tekking, papp, folie). Levetid varierer med tekkingstype. Standarden bruker 30 år som generell aldersterskel for taktekking.",
  },
  {
    bygningsdel: "tak",
    underenhet: "takkonstruksjon",
    label: "Undertak",
    standardreferanse: "12.4",
    aldersterskelAar: null,
    hjelpetekst:
      "Eldre undertak (diffusjonsåpne eller av papp) kan ha begrenset gjenværende funksjon. Standarden angir ingen spesifikk aldersterskel — vurderes individuelt.",
  },
  {
    bygningsdel: "vatrom",
    underenhet: "membran_tettesjikt",
    label: "Membran / tettesjikt",
    standardreferanse: "12.4",
    aldersterskelAar: null,
    hjelpetekst:
      "Membranens alder og dokumentasjon er relevante faktorer i risikovurdering av våtrom. Standarden angir ingen spesifikk aldersterskel — alder alene er ikke tilstrekkelig grunnlag. Vurderes i sammenheng med type membran, dokumentasjon og synlig tilstand.",
  },
  {
    bygningsdel: "tekniske_installasjoner",
    underenhet: "innvendige_vannror",
    label: "Vann- og avløpsledninger",
    standardreferanse: "12.4 / Tillegg C",
    aldersterskelAar: 40,
    hjelpetekst:
      "Rørinstallasjoner har forventet levetid avhengig av materiale. Standarden bruker 40 år som aldersterskel.",
  },
  {
    bygningsdel: "tekniske_installasjoner",
    underenhet: "varmtvannstank",
    label: "Varmtvannsbereder",
    standardreferanse: "12.4 / Tillegg C",
    aldersterskelAar: 20,
    hjelpetekst:
      "Varmtvannsberedere har begrenset levetid. Standarden bruker 20 år som aldersterskel.",
  },
  {
    bygningsdel: "tekniske_installasjoner",
    underenhet: "ventilasjon",
    label: "Ventilasjonsaggregat",
    standardreferanse: "12.4 / Tillegg C",
    aldersterskelAar: 15,
    hjelpetekst:
      "Ventilasjonsanlegg har begrenset levetid og ytelsen reduseres over tid. Standarden bruker 15 år som aldersterskel.",
  },
  // Merk: Varmepumpe (luft-luft / bergvarme) er ikke en egen underenhet
  // i bygningsdeler.ts per i dag. Legges til når underenhet-listen utvides.
];

// ─── Oppslags-funksjoner ───────────────────────────────────

/** Cache for rask oppslag — bygges én gang */
const _alderslogikkMap = new Map<string, AlderslogikkConfig>();
for (const cfg of ALDERSLOGIKK_UNDERENHETER) {
  _alderslogikkMap.set(`${cfg.bygningsdel}/${cfg.underenhet}`, cfg);
}

/**
 * Sjekk om en bygningsdel/underenhet har alderslogikk
 * i NS 3600:2025.
 */
export function harAlderslogikk(
  bygningsdelKey: string,
  underenhetKey: string
): boolean {
  return _alderslogikkMap.has(`${bygningsdelKey}/${underenhetKey}`);
}

/**
 * Hent alderslogikk-config for en underenhet.
 * Returnerer null hvis underenheten ikke har alderslogikk.
 */
export function hentAlderslogikk(
  bygningsdelKey: string,
  underenhetKey: string
): AlderslogikkConfig | null {
  return _alderslogikkMap.get(`${bygningsdelKey}/${underenhetKey}`) ?? null;
}

/**
 * Sjekk om aldersvurdering er relevant for gitt input.
 * Kun relevant for NS 3600:2025 + underenhet med alderslogikk.
 */
export function erAldersvurderingRelevant(
  nsVersjon: NsVersjon,
  bygningsdelKey: string,
  underenhetKey: string
): boolean {
  if (nsVersjon !== "NS3600_2025") return false;
  return harAlderslogikk(bygningsdelKey, underenhetKey);
}
