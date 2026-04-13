/**
 * ARKAT Skrivehjelp — barrel export
 */
export type {
  ArkatGenerateInput,
  ArkatGenerateResponse,
  ArkatGeneratedResult,
  ArkatScreeningResult,
  Tilstandsgrad,
  Hovedgrunnlag,
  ObservasjonsTillegg,
  Akuttgrad,
  OnsketLengde,
} from "./types/arkat";

export { BYGNINGSDELER } from "./config/bygningsdeler";
export { isArkatEnabled } from "./lib/feature-flag";
export { generateArkat } from "./lib/generate";
export { screenObservasjon } from "./lib/screening";
export { ArkatInputSchema } from "./lib/validators";
export {
  hentTerminologi,
  hentTgTerminologi,
  harTerminologidekning,
  finnForbiddenPhrases,
} from "./lib/terminology";
