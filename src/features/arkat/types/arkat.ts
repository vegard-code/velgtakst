/**
 * ARKAT Skrivehjelp — typer
 *
 * Sentral typedefinisjon for hele ARKAT-modulen.
 */

// ----- Enums / union-typer -----

export type NsVersjon = "NS3600_2018" | "NS3600_2025";

export type Aldersvurdering =
  | "ikke_brukt"
  | "brukes_som_grunnlag";

export type Tilstandsgrad = "TG2" | "TG3";

/**
 * Hovedgrunnlag for vurderingen — velg ett.
 * Erstatter det gamle "Observasjonstype"-feltet med tydeligere semantikk:
 * dette er det primære grunnlaget takstmannen baserer vurderingen på.
 */
export type Hovedgrunnlag =
  | "visuell_observasjon"
  | "maaling_indikasjon"
  | "alder_slitasje"
  | "dokumentasjon_mangler";

/**
 * Tillegg som nyanserer hovedgrunnlaget — velg null eller flere.
 * Påvirker språkstyrke og varsler i genereringen.
 */
export type ObservasjonsTillegg =
  | "undersoekelsesbegrensning"
  | "ingen_paavist_skade"
  | "alder_som_grunnlag"
  | "dokumentasjon_mangler";

export type Akuttgrad =
  | "ikke_akutt"
  | "bor_folges_opp"
  | "haster";

export type OnsketLengde = "kort" | "normal";

// ----- Labels for UI -----

export const TILSTANDSGRAD_LABELS: Record<Tilstandsgrad, string> = {
  TG2: "TG2 – Avvik som kan kreve tiltak",
  TG3: "TG3 – Store eller alvorlige avvik",
};

export const HOVEDGRUNNLAG_LABELS: Record<Hovedgrunnlag, string> = {
  visuell_observasjon: "Visuell observasjon",
  maaling_indikasjon: "Måling / indikasjon",
  alder_slitasje: "Alder / slitasje",
  dokumentasjon_mangler: "Dokumentasjon mangler",
};

export const OBSERVASJONS_TILLEGG_LABELS: Record<ObservasjonsTillegg, string> = {
  undersoekelsesbegrensning: "Undersøkelsesbegrensning",
  ingen_paavist_skade: "Ingen påvist skade",
  alder_som_grunnlag: "Alder brukt som del av grunnlaget",
  dokumentasjon_mangler: "Dokumentasjon mangler",
};

export const AKUTTGRAD_LABELS: Record<Akuttgrad, string> = {
  ikke_akutt: "Ikke akutt",
  bor_folges_opp: "Bør følges opp",
  haster: "Haster",
};

export const ONSKET_LENGDE_LABELS: Record<OnsketLengde, string> = {
  kort: "Kort",
  normal: "Normal",
};

export const NS_VERSJON_LABELS: Record<NsVersjon, string> = {
  NS3600_2018: "NS 3600:2018",
  NS3600_2025: "NS 3600:2025",
};

export const ALDERSVURDERING_LABELS: Record<Aldersvurdering, string> = {
  ikke_brukt: "Ikke brukt",
  brukes_som_grunnlag: "Brukes som del av grunnlaget",
};

// ----- Request / Response -----

export interface ArkatGenerateInput {
  bygningsdel: string;
  underenhet: string;
  /** Valgfri for merknad-modus (f.eks. elektrisk anlegg) */
  tilstandsgrad?: Tilstandsgrad;
  /** Submodus — brukes når underenheten har delvise merknad-områder (f.eks. balkong: konstruksjon vs. rekkverk) */
  submodus?: string;
  hovedgrunnlag: Hovedgrunnlag;
  tillegg: ObservasjonsTillegg[];
  akuttgrad: Akuttgrad;
  observasjon: string;
  onsket_lengde?: OnsketLengde;
  ns_versjon: NsVersjon;
  /** Kun relevant for NS 3600:2025 + utvalgte underenheter */
  aldersvurdering?: Aldersvurdering;
}

export interface ArkatScreeningResult {
  approved_for_generation: boolean;
  reason: string | null;
  warnings: string[];
}

export interface ArkatGeneratedResult {
  arsak: string;
  risiko: string;
  konsekvens: string;
  anbefalt_tiltak: string;
  /** Satt til "merknad" for underenheter uten TG (f.eks. el-anlegg) */
  modus?: "standard" | "merknad";
}

export interface ArkatGenerateResponse {
  success: boolean;
  screening: ArkatScreeningResult;
  result: ArkatGeneratedResult | null;
}
