/**
 * Input-screening for ARKAT.
 *
 * Stram screening: observasjonen MÅ inneholde en konkret
 * skade, symptom, måling, slitasje eller dokumentmangel.
 * Generelle inntrykk som «ser dårlig ut» stoppes.
 */
import type { ArkatGenerateInput, ArkatScreeningResult } from "../types/arkat";
import { BYGNINGSDELER } from "../config/bygningsdeler";
import { hentTerminologi, finnObservasjonsMatch } from "./terminology";

// ─── Nonsens-mønstre ────────────────────────────────────────

const NONSENS_PATTERNS = [
  /^[a-zæøå\s]{1,8}$/i,
  /^(.)\1{3,}$/i,
  /test+\s*$/i,
  /^hei+\s*$/i,
  /^hallo+\s*$/i,
  /^asdf/i,
  /^lorem ipsum/i,
  /^blabla/i,
  /^ingenting/i,
  /^xxx/i,
  /^qqq/i,
  /^123/i,
  /^ok+\s*$/i,
  /^ja+\s*$/i,
  /^nei+\s*$/i,
];

/**
 * Ord/fraser som indikerer generelle inntrykk uten konkret observasjon.
 * Hvis observasjonen KUN består av slike, er den for vag.
 */
const VAGE_UTTRYKK = [
  "ser ikke bra ut", "ser dårlig ut", "ser litt", "ser ganske",
  "dårlig tilstand", "dårlig inntrykk", "generelt dårlig",
  "bør gjøres noe", "bør nok", "etter hvert",
  "gammelt", "slitt", "nedslitt",
  "ikke bra", "ikke pent", "ikke ok",
  "virker dårlig", "virker slitt", "virker gammelt",
  "litt skjevt", "litt slitt", "litt dårlig",
  "trenger oppgradering", "trenger oppussing",
  "ser ut til å trenge", "ser ut som",
];

/**
 * Konkrete observasjonsmarkører — ord som indikerer at takstmannen
 * har beskrevet en reell, spesifikk observasjon.
 */
const KONKRETE_MARKORER = [
  // Fukt/vann
  "fukt", "lekkasje", "vanninntrenging", "vannmerke", "kondens",
  "dugg", "mugg", "soppvekst", "råte", "kalkutslag", "misfarging",
  "vått", "fuktig", "stående vann", "avrenning", "overflatevann",

  // Fysiske skader
  "sprekk", "riss", "brudd", "knekt", "deformasjon", "bøy",
  "heng", "svikt", "setning", "forskyvning", "løs",
  "avflassing", "avskalling", "hulrom", "korrosjon",

  // Målinger og observerbare forhold
  "fall", "terrengfall", "måling", "fuktmåling", "indikasjon",
  "punktert", "trekk", "luftlekkasje", "temperaturforskjell",

  // Mangler og dokumentasjon
  "mangler", "manglende", "fraværende", "dokumentasjon",
  "samsvarserklæring", "ikke registrert", "ikke påvist",
  "utilstrekkelig", "ikke tilstrekkelig", "redusert",

  // Alder med kontekst (ikke bare «gammelt»)
  "fra 19", "fra 20", "byggeår", "levetid", "år gammel",
  "aldri blitt", "opprinnelig fra", "ikke skiftet",
  "ikke rehabilitert", "ikke vedlikeholdt",

  // Konstruksjonsdeler med tilstand
  "drensrør", "drenering", "membran", "tettesjikt", "grunnmursplast",
  "flis", "fuge", "silikon", "takstein", "taktekking",
  "isolerglass", "karm", "ramme", "beslag", "vannbord",
  "undertak", "mønekam", "sluk", "ventilasjon",

  // Sikkerhet
  "gelender", "rekkverk", "sikring", "jordfeilvern",
  "skrusikring", "brannfare", "personfare",
];

// ─── Hovedfunksjon ──────────────────────────────────────────

export function screenObservasjon(input: ArkatGenerateInput): ArkatScreeningResult {
  const warnings: string[] = [];
  const obs = input.observasjon.trim();
  const obsLower = obs.toLowerCase();

  // 1. Tom eller for kort
  if (obs.length < 20) {
    return avvis(
      "Observasjonen er for kort. Beskriv konkret hva som er observert — " +
      "type skade, plassering, omfang eller måleverdi."
    );
  }

  // 2. Nonsens
  for (const pattern of NONSENS_PATTERNS) {
    if (pattern.test(obs)) {
      return avvis(
        "Observasjonen virker ikke relevant. Beskriv en konkret observasjon " +
        "med type skade, symptom eller måleverdi."
      );
    }
  }

  // 3. Vag-sjekk — inneholder teksten KUN generelle inntrykk?
  const harVagtUttrykk = VAGE_UTTRYKK.some((v) => obsLower.includes(v));
  const harKonkretMarkor = harKonkretObservasjon(obsLower, input);

  if (harVagtUttrykk && !harKonkretMarkor) {
    return avvis(
      "Observasjonen beskriver et generelt inntrykk, men mangler konkrete detaljer. " +
      "ARKAT krever en spesifikk observasjon — hva er skadet, hva er symptomene, " +
      "hva er målt eller registrert?"
    );
  }

  if (!harKonkretMarkor) {
    // Ingen konkrete markører funnet overhodet
    if (obs.length < 80) {
      return avvis(
        "Observasjonen mangler konkrete detaljer om skade, symptom, måling eller " +
        "dokumentmangel. Beskriv hva som faktisk er observert."
      );
    }
    // Lengre tekst uten kjente markører — gi advarsel, men tillat
    // (det KAN være faguttrykk vi ikke har i listen)
    warnings.push(
      "Observasjonen inneholder få gjenkjennelige bygningsfaglige termer. " +
      "Kontroller at den beskriver en reell, konkret observasjon."
    );
  }

  // 4. Konsistenssjekker
  if (input.tilstandsgrad === "TG3" && input.akuttgrad === "ikke_akutt") {
    warnings.push(
      "Du har valgt TG3 (alvorlig avvik) men akuttgrad «ikke akutt». Vurder om dette er riktig."
    );
  }

  if (obs.length > 2000) {
    warnings.push(
      "Observasjonen er svært lang. ARKAT fungerer best med konsentrerte observasjoner."
    );
  }

  // 5. Sjekk kryssende bygningsdel
  const bygningsdel = BYGNINGSDELER.find((b) => b.key === input.bygningsdel);
  if (bygningsdel) {
    for (const annen of BYGNINGSDELER) {
      if (
        annen.key !== input.bygningsdel &&
        annen.label.length > 4 &&
        obsLower.includes(annen.label.toLowerCase())
      ) {
        warnings.push(
          `Observasjonen nevner «${annen.label}», men valgt bygningsdel er «${bygningsdel.label}». Sjekk at du har valgt riktig.`
        );
        break;
      }
    }
  }

  return {
    approved_for_generation: true,
    reason: null,
    warnings,
  };
}

// ─── Hjelpefunksjoner ───────────────────────────────────────

function harKonkretObservasjon(obsLower: string, input: ArkatGenerateInput): boolean {
  // Sjekk mot generelle konkrete markører
  const harGenerellMarkor = KONKRETE_MARKORER.some((m) =>
    obsLower.includes(m.toLowerCase())
  );
  if (harGenerellMarkor) return true;

  // Sjekk mot terminologibibiblioteket hvis tilgjengelig
  const terminologi = hentTerminologi(input.bygningsdel, input.underenhet);
  if (terminologi) {
    const matches = finnObservasjonsMatch(terminologi, obsLower);
    if (matches.length > 0) return true;

    // Sjekk mot fagtermer
    const harFagterm = terminologi.fagtermer.some((t) =>
      obsLower.includes(t.toLowerCase())
    );
    if (harFagterm) return true;
  }

  return false;
}

function avvis(reason: string): ArkatScreeningResult {
  return {
    approved_for_generation: false,
    reason,
    warnings: [],
  };
}
