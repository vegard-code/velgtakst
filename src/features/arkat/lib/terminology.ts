/**
 * Oppslag i terminologibiblioteket.
 *
 * Laster terminology_library.json og gir typesikker tilgang
 * til fagtermer, observasjonsmarkører og eksempel-ARKAT per
 * bygningsdel / underenhet / TG.
 */
import libraryJson from "../data/terminology_library.json";
import forbiddenJson from "../data/forbidden_phrases.json";
import type { Tilstandsgrad } from "../types/arkat";

// ─── Typer for terminologidata ──────────────────────────────

export interface ObservasjonsMarkor {
  [kategori: string]: string[];
}

export interface TgTerminologi {
  arsaker: string[];
  risikoer: string[];
  konsekvenser: string[];
  tiltak: string[];
}

export interface MerknadTerminologi {
  merknader: string[];
  konsekvenser: string[];
  tiltak: string[];
}

export interface UnderenhetTerminologi {
  fagtermer: string[];
  observasjonsmarkorer: ObservasjonsMarkor;
  /** Årsaksmekanismer per observasjonskategori — forklarer HVORFOR symptomene oppstår */
  aarsaksmekanismer?: Record<string, string>;
  TG2?: TgTerminologi;
  TG3?: TgTerminologi;
  /** Merknad-modus (f.eks. elektrisk anlegg) — ingen TG */
  modus?: "merknad";
  merknad?: MerknadTerminologi;
}

export interface ForbiddenPhrase {
  phrase: string;
  grunn: string;
}

// ─── Loader ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const library = libraryJson as Record<string, any>;

/**
 * Hent terminologi for en spesifikk bygningsdel/underenhet.
 * Returnerer null hvis kombinasjonen ikke er dekket i v1.
 */
export function hentTerminologi(
  bygningsdelKey: string,
  underenhetKey: string
): UnderenhetTerminologi | null {
  const bd = library[bygningsdelKey];
  if (!bd || typeof bd !== "object") return null;
  const ue = bd[underenhetKey];
  if (!ue || typeof ue !== "object" || !ue.fagtermer) return null;
  return ue as UnderenhetTerminologi;
}

/**
 * Hent TG-spesifikk terminologi (årsaker, risikoer, etc.)
 */
export function hentTgTerminologi(
  bygningsdelKey: string,
  underenhetKey: string,
  tg: Tilstandsgrad
): TgTerminologi | null {
  const ue = hentTerminologi(bygningsdelKey, underenhetKey);
  if (!ue) return null;
  return ue[tg] ?? null;
}

/**
 * Finn hvilke observasjonsmarkør-kategorier som matcher observasjonsteksten.
 * Returnerer en liste med kategori-navn + matchede ord.
 */
export function finnObservasjonsMatch(
  terminologi: UnderenhetTerminologi,
  observasjon: string
): { kategori: string; treff: string[] }[] {
  const obsLower = observasjon.toLowerCase();
  const matches: { kategori: string; treff: string[] }[] = [];

  for (const [kategori, markorer] of Object.entries(terminologi.observasjonsmarkorer)) {
    const treff = markorer.filter((m) => {
      const mLower = m.toLowerCase();
      const pos = obsLower.indexOf(mLower);
      if (pos === -1) return false;
      // Finn starten av ordet som inneholder markøren —
      // negasjon gjelder hele ordet, ikke bare delstrengen
      const ordStart = finnOrdStart(obsLower, pos);
      if (erNegert(obsLower, ordStart, pos + mLower.length)) return false;
      return true;
    });
    if (treff.length > 0) {
      matches.push({ kategori, treff });
    }
  }

  return matches;
}

/** Finn starten av ordet som inneholder posisjon `pos` */
function finnOrdStart(tekst: string, pos: number): number {
  let start = pos;
  while (start > 0 && /\S/.test(tekst[start - 1])) {
    start--;
  }
  return start;
}

/**
 * Sjekk om et ord på posisjon `pos` i teksten er negert eller
 * beskrevet i positiv kontekst ("er i god stand", "fremstår intakt").
 *
 * Ser på vindu FØR markøren (negasjon, positiv kontekst) og
 * vindu ETTER markøren (positiv tilstandsbeskrivelse).
 * Bruker \S+ i stedet for \w+ for å håndtere norske tegn (æøå).
 */
function erNegert(tekst: string, ordStart: number, ordSlutt?: number): boolean {
  const foer = tekst.slice(Math.max(0, ordStart - 40), ordStart);
  const slutt = ordSlutt ?? ordStart;
  const etter = tekst.slice(slutt, Math.min(tekst.length, slutt + 50));

  // 1. Eksplisitt negasjon FØR: "ingen synlige skader på X", "uten tegn til X"
  if (/\b(ingen|ikke|uten|intet|hverken)\s+(\S+\s+){0,3}$/.test(foer)) {
    return true;
  }

  // 2. Positiv tilstand ETTER markøren: "karmene er i god stand", "...fremstår intakt"
  //    ^\S* matcher resten av ordet markøren er del av (f.eks. "ene" i "karmene")
  if (/^\S*\s+(er|fremstår)\s+(intakt|tett|hel)/i.test(etter)) {
    return true;
  }
  if (/^\S*\s+er\s+i\s+god\s+stand/i.test(etter)) {
    return true;
  }
  if (/^\S*\s+fremstår\s+\S*\s*(intakt|tett|hel)/i.test(etter)) {
    return true;
  }

  // 3. Positiv tilstand FØR markøren
  if (/\b(fremstår|er)\s+(intakt|tett|hel)/i.test(foer)) {
    return true;
  }

  return false;
}

/**
 * Hent merknad-terminologi for underenheter uten TG.
 *
 * To varianter:
 * 1. Hele underenheten er merknad-modus (f.eks. el-anlegg): ue.merknad
 * 2. Submodus-basert merknad (f.eks. rekkverk på balkong): ue.merknad_<submodus>
 */
export function hentMerknadTerminologi(
  bygningsdelKey: string,
  underenhetKey: string,
  submodus?: string
): MerknadTerminologi | null {
  const ue = hentTerminologi(bygningsdelKey, underenhetKey);
  if (!ue) return null;

  // Submodus-basert: sjekk merknad_<submodus> nøkkel
  if (submodus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subKey = `merknad_${submodus}` as keyof typeof ue;
    const subData = (ue as any)[subKey];
    if (subData && subData.merknader && subData.konsekvenser && subData.tiltak) {
      return subData as MerknadTerminologi;
    }
    return null;
  }

  // Hele underenheten er merknad-modus
  if (ue.modus !== "merknad" || !ue.merknad) return null;
  return ue.merknad;
}

/**
 * Sjekk om en underenhet har terminologidekning i v1.
 */
export function harTerminologidekning(
  bygningsdelKey: string,
  underenhetKey: string
): boolean {
  return hentTerminologi(bygningsdelKey, underenhetKey) !== null;
}

// ─── Forbudte fraser ────────────────────────────────────────

const forbidden = forbiddenJson as {
  forbidden: ForbiddenPhrase[];
  soft_warnings: { pattern: string; grunn: string }[];
};

export function hentForbiddenPhrases(): string[] {
  return forbidden.forbidden.map((f) => f.phrase);
}

export function hentForbiddenPhrasesWithReasons(): ForbiddenPhrase[] {
  return forbidden.forbidden;
}

/**
 * Sjekk en tekst mot svartelisten.
 * Returnerer alle forbudte fraser som ble funnet.
 */
export function finnForbiddenPhrases(tekst: string): string[] {
  const lower = tekst.toLowerCase();
  return forbidden.forbidden
    .filter((f) => lower.includes(f.phrase.toLowerCase()))
    .map((f) => f.phrase);
}

/**
 * Fjern forbudte fraser fra en tekst ved å erstatte dem.
 * Brukes som siste-linje forsvar i output-validering.
 */
export function fjernForbiddenPhrases(tekst: string): string {
  let result = tekst;
  for (const f of forbidden.forbidden) {
    // Case-insensitive erstatning
    const regex = new RegExp(escapeRegExp(f.phrase), "gi");
    result = result.replace(regex, "").replace(/\s{2,}/g, " ").trim();
  }
  // Rydd opp doble punktum og mellomrom
  result = result.replace(/\.\s*\./g, ".").replace(/\s{2,}/g, " ").trim();
  return result;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
