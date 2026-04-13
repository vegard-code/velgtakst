/**
 * ARKAT genereringsmotor v3.0 — hybrid AI + lokal.
 *
 * FLYT:
 * 1. Screening: Lokal motor sjekker om observasjonen har nok grunnlag
 * 2. AI-generering: Hvis tilgjengelig, brukes OpenAI Response API
 * 3. Lokal fallback: Hvis AI er av/feiler, brukes den lokale motoren
 *
 * PRINSIPP: Observasjonen er hovedgrunnlag. Systemet skal aldri
 * introdusere konkrete forhold som ikke kan utledes av observasjonen.
 * Dette håndheves via screening (trinn 1) og AI-prompt (trinn 2).
 *
 * Terminologibiblioteket brukes kun til:
 * - å foreslå faguttrykk som passer observasjonens innhold
 * - å gi struktur-maler for setningsmønster (ikke ferdig tekst)
 * - å gi standardiserte konsekvens/tiltak-tekster (kostnads- og tiltaksinformasjon)
 *
 * Endringer i v3.0 (AI-integrasjon):
 * - Hybrid flyt: AI genererer, lokal motor er guardrail og fallback
 * - AI-modus styres av env: OPENAI_API_KEY (live), ARKAT_AI_MOCK (mock), ellers lokal
 * - Screening og observasjonsanalyse kjøres ALLTID (uavhengig av AI-modus)
 * - Lokal motor beholdes fullt funksjonell som fallback
 */
import type {
  ArkatGenerateInput,
  ArkatGeneratedResult,
  ArkatGenerateResponse,
} from "../types/arkat";
import { BYGNINGSDELER } from "../config/bygningsdeler";
import {
  hentTerminologi,
  hentTgTerminologi,
  finnObservasjonsMatch,
  harTerminologidekning,
} from "./terminology";
import type { TgTerminologi, UnderenhetTerminologi } from "./terminology";
import { genererMedAi } from "./generate-ai";
import { aiModus } from "./openai-client";

// ─── Public API ─────────────────────────────────────────────

/**
 * Hovedfunksjon — kall denne fra API-routen.
 *
 * Hybrid flyt:
 * 1. Hent terminologi og kjør observasjonsanalyse (lokal screening)
 * 2. Hvis screening feiler → returner avslag umiddelbart
 * 3. Forsøk AI-generering (live/mock)
 * 4. Hvis AI ikke tilgjengelig eller feiler → bruk lokal motor
 */
export async function generateArkat(
  input: ArkatGenerateInput
): Promise<ArkatGenerateResponse> {
  const terminologi = hentTerminologi(input.bygningsdel, input.underenhet);
  const tgData = hentTgTerminologi(input.bygningsdel, input.underenhet, input.tilstandsgrad);

  // ── Trinn 1: Lokal screening (kjøres ALLTID) ──
  // Har vi terminologidekning?
  if (!terminologi || !tgData) {
    return {
      success: false,
      screening: {
        approved_for_generation: false,
        reason:
          `Denne underenheten støttes ikke ennå. ` +
          `Vi utvider støtten løpende — i mellomtiden kan du velge en annen underenhet eller skrive vurderingen manuelt.`,
        warnings: [],
      },
      result: null,
    };
  }

  // Analyser observasjonen
  const analyse = analyserObservasjon(input, terminologi);

  if (analyse.dekning === "ingen") {
    return {
      success: false,
      screening: {
        approved_for_generation: false,
        reason:
          "Observasjonen inneholder ikke nok gjenkjennelige detaljer til å generere " +
          "faglig forsvarlig ARKAT. Beskriv konkret hva som er observert.",
        warnings: [],
      },
      result: null,
    };
  }

  // Ekstra sikkerhetsgate: svak dekning + kort observasjon = for tynt grunnlag
  if (analyse.dekning === "svak" && input.observasjon.trim().length < 50) {
    return {
      success: false,
      screening: {
        approved_for_generation: false,
        reason:
          "Observasjonen gir for svakt grunnlag for ARKAT-generering. " +
          "Beskriv mer konkret hva som er observert — type skade, omfang, plassering eller måleverdi.",
        warnings: [],
      },
      result: null,
    };
  }

  // ── Trinn 2: Forsøk AI-generering ──
  const modus = aiModus();
  if (modus !== "av") {
    const aiResultat = await genererMedAi(input, terminologi, tgData);

    if (aiResultat.bruktAi && aiResultat.resultat) {
      // AI-generering vellykket — samle alle varsler
      const warnings = [...analyse.advarsler];
      if (aiResultat.kilde === "mock") {
        warnings.push("AI-modus: mock — resultatet er ikke generert av AI.");
      }
      if (aiResultat.kilde === "live") {
        warnings.push("Teksten er AI-generert og bør kontrolleres av takstmannen før bruk.");
      }
      // Legg til varsler fra AI-modellen selv (forbehold, usikkerhet)
      if (aiResultat.varsler.length > 0) {
        warnings.push(...aiResultat.varsler);
      }

      return {
        success: true,
        screening: {
          approved_for_generation: true,
          reason: null,
          warnings,
        },
        result: aiResultat.resultat,
      };
    }

    // AI feilet — logg men fall videre til lokal motor
    if (aiResultat.feil) {
      console.warn("AI-generering feilet, bruker lokal motor:", aiResultat.feil);
    }
  }

  // ── Trinn 3: Lokal motor (fallback) ──
  const result = byggArkat(input, analyse, tgData);

  return {
    success: true,
    screening: {
      approved_for_generation: true,
      reason: null,
      warnings: analyse.advarsler,
    },
    result,
  };
}

// ─── Observasjonsanalyse ────────────────────────────────────

interface ObservasjonsAnalyse {
  /** Hva observasjonen handler om, gruppert i kategorier */
  matchKategorier: string[];
  /** Spesifikke treff-ord fra observasjonen */
  treff: { kategori: string; ord: string[] }[];
  /** Hele observasjonen som kjernetekst */
  kjerne: string;
  /** Vurdering av observasjonskvalitet */
  dekning: "god" | "svak" | "ingen";
  /** Advarsler */
  advarsler: string[];
  /**
   * Om alder brukes som eksplisitt grunnlag for TG-vurdering.
   * Kun true når NS3600_2025 + aldersvurdering="brukes_som_grunnlag".
   * Når true: alder/dok-kategorier får full språkstyrke i risikotekst.
   */
  alderSomGrunnlag: boolean;
}

function analyserObservasjon(
  input: ArkatGenerateInput,
  terminologi: UnderenhetTerminologi
): ObservasjonsAnalyse {
  const obs = input.observasjon.trim();
  const matches = finnObservasjonsMatch(terminologi, obs);
  const advarsler: string[] = [];

  // Vurder dekningsgrad
  let dekning: "god" | "svak" | "ingen";
  if (matches.length >= 2) {
    dekning = "god";
  } else if (matches.length === 1) {
    dekning = "svak";
    advarsler.push(
      "Observasjonen gir begrenset grunnlag for detaljert ARKAT. " +
      "Mer spesifikke detaljer ville gitt bedre resultat."
    );
  } else {
    // Sjekk om det er fagtermer selv om markørene ikke matcher
    const obsLower = obs.toLowerCase();
    const harFagterm = terminologi.fagtermer.some((t) =>
      obsLower.includes(t.toLowerCase())
    );
    dekning = harFagterm ? "svak" : "ingen";
    if (harFagterm) {
      advarsler.push(
        "Observasjonen gir begrenset grunnlag for detaljert ARKAT. " +
        "Mer spesifikke detaljer ville gitt bedre resultat."
      );
    }
  }

  // NS 3600:2025 — alder som eksplisitt grunnlag
  const alderSomGrunnlag =
    input.ns_versjon === "NS3600_2025" &&
    input.aldersvurdering === "brukes_som_grunnlag";

  return {
    matchKategorier: matches.map((m) => m.kategori),
    treff: matches.map((m) => ({ kategori: m.kategori, ord: m.treff })),
    kjerne: obs,
    dekning,
    advarsler,
    alderSomGrunnlag,
  };
}

// ─── ARKAT-bygging ──────────────────────────────────────────

function byggArkat(
  input: ArkatGenerateInput,
  analyse: ObservasjonsAnalyse,
  tgData: TgTerminologi
): ArkatGeneratedResult {
  const erKort = input.onsket_lengde === "kort";
  const bd = BYGNINGSDELER.find((b) => b.key === input.bygningsdel);
  const ue = bd?.underenheter.find((u) => u.key === input.underenhet);
  const ueLabel = ue?.label ?? input.underenhet;

  // Referanser — brukes KUN som strukturmal, aldri som direkte kilde
  const risikoRef = finnRelevantReferanse(tgData.risikoer, analyse);

  // Bygg hvert felt
  const arsak = byggArsak(analyse, ueLabel, erKort);
  const risiko = byggRisiko(analyse, risikoRef, erKort, analyse.alderSomGrunnlag);
  const konsekvens = byggKonsekvens(analyse, tgData, ueLabel, erKort);
  const tiltak = byggTiltak(analyse, tgData, ueLabel, input, erKort);

  return { arsak, risiko, konsekvens, anbefalt_tiltak: tiltak };
}

/**
 * Finn den referanseteksten som tematisk ligner mest på observasjonen.
 * Returnerer null hvis ingen har god match.
 * VIKTIG: Referanseteksten skal ALDRI brukes direkte — kun som strukturmal.
 */
function finnRelevantReferanse(
  kandidater: string[],
  analyse: ObservasjonsAnalyse
): string | null {
  if (kandidater.length === 0) return null;

  const obsOrd = extraherSignifikanteOrd(analyse.kjerne.toLowerCase());
  let bestScore = 0;
  let best: string | null = null;

  for (const k of kandidater) {
    const kLower = k.toLowerCase();
    let score = 0;
    for (const ord of obsOrd) {
      if (kLower.includes(ord)) score += 1;
    }
    for (const kat of analyse.matchKategorier) {
      if (kLower.includes(kat)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }

  // Krev minimum 2 i score for å anse referansen som relevant
  return bestScore >= 2 ? best : null;
}

// ─── Felt-byggere ───────────────────────────────────────────

/**
 * ÅRSAK — bygges DIREKTE fra observasjonen.
 *
 * Ingen referansetekst brukes. Observasjonen reformuleres minimalt:
 * - Har allerede faglig prefix → bruk som den er
 * - Mangler prefix → legg til nøytralt "Det er registrert"
 * - Svak dekning → legg til kontekst om underenhet som separat setning
 */
function byggArsak(
  analyse: ObservasjonsAnalyse,
  ueLabel: string,
  kort: boolean
): string {
  const obs = analyse.kjerne.trim();

  if (kort) {
    return avsluttSetning(lagKortKjerne(obs));
  }

  // Sjekk om observasjonen allerede har en faglig prefix
  const harFagligPrefix =
    /^(det er |det ble |vi har )?(observert|registrert|påvist|konstatert)/i.test(obs);

  // Sjekk om observasjonen er en fullstendig setning (har hovedverb)
  // Slike skal IKKE få "Det er registrert" foran — det gir ødelagt grammatikk
  const erFullSetning =
    /\b(har|er|viser|mangler|innebærer|medfører|tyder|indikerer|fremstår|fungerer|ligger)\b/i.test(obs);

  let arsak: string;

  if (harFagligPrefix || erFullSetning) {
    // Observasjonen er allerede en komplett setning — bruk direkte
    arsak = avsluttSetning(obs);
  } else {
    // Fragment uten verb — legg til nøytral prefix
    const kjerne = lavKjerne(obs);
    arsak = avsluttSetning(`Det er registrert ${kjerne}`);
  }

  // Svak dekning: legg til kontekst om underenhet hvis den ikke allerede er nevnt
  if (analyse.dekning === "svak") {
    const obsLower = obs.toLowerCase();
    const ueOrd = ueLabel.toLowerCase().split(/[\s/]+/);
    const nevnerUe = ueOrd.some(
      (ord) => ord.length > 4 && obsLower.includes(ord)
    );
    if (!nevnerUe) {
      arsak += ` Forholdet gjelder ${ueLabel.toLowerCase()}.`;
    }
  }

  return arsak;
}

/**
 * RISIKO — utledes fra observasjonens matchede kategorier.
 *
 * Kategorier er gruppert for å unngå duplisert risikotekst.
 * Vi trekker BARE konklusjoner som følger logisk av observerte forhold.
 */
function byggRisiko(
  analyse: ObservasjonsAnalyse,
  referanse: string | null,
  kort: boolean,
  alderSomGrunnlag: boolean = false
): string {
  const kat = new Set(analyse.matchKategorier);
  const risikoElementer: string[] = [];

  // Klassifiser grunnlag: har vi konkrete symptomer, eller kun alder/dokumentasjon?
  // Dette styrer språkstyrken — usikkerhet vs. konkret risiko.
  //
  // UNNTAK: Når NS 3600:2025 + aldersvurdering="brukes_som_grunnlag",
  // behandles alder/dokumentasjon som fullverdig grunnlag — full språkstyrke.
  // Takstmannen har da eksplisitt bekreftet at alder er del av TG-vurderingen
  // iht. den nye standarden.
  const SYMPTOM_KATEGORIER = new Set([
    "fukt", "vann", "lekkasje", "sprekk", "flis", "fuge",
    "sluk", "gjennomforing", "glass", "karm",
    "stein", "skade", "papp", "plater", "mose", "beslag",
    "pumpe", "drenering", "fall", "fyll", "beplantning",
    "overflateskade", "rekkverk", "nedboyning", "lyd",
    "ror", "korrosjon", "tank", "anlegg", "avtrekk",
  ]);
  const harKonkretSymptom =
    alderSomGrunnlag || [...kat].some((k) => SYMPTOM_KATEGORIER.has(k));

  // ── Gruppe: Direkte fukt/vann i konstruksjon ──
  if (kat.has("fukt") || kat.has("vann") || kat.has("lekkasje")) {
    risikoElementer.push("fuktinntrengning i konstruksjonen");
  }

  // ── Gruppe: Fuktbelastning mot grunnmur (terreng, fyll, beplantning) ──
  if (kat.has("fall") || kat.has("fyll") || kat.has("beplantning")) {
    risikoElementer.push("økt fuktbelastning mot grunnmur og fuktsikring");
  }

  // ── Gruppe: Drenering ──
  if (kat.has("drenering")) {
    risikoElementer.push("sviktende bortledning av vann fra konstruksjonen");
  }

  // ── Gruppe: Overflateskader (flis, fuge, sprekk) ──
  if (kat.has("flis") || kat.has("fuge") || kat.has("sprekk")) {
    risikoElementer.push("fuktinntrengning bak eller gjennom skadet overflate");
  }

  // ── Gruppe: Membran/tettesjikt ──
  // Språkstyrke avhenger av om det er konkrete symptomer eller kun tilstand/alder
  if (kat.has("membran") || kat.has("sluk") || kat.has("gjennomforing")) {
    if (harKonkretSymptom) {
      risikoElementer.push("vanngjennomgang til underliggende konstruksjon");
    } else {
      risikoElementer.push(
        "usikkerhet knyttet til tettesjiktets tetthet og gjenværende funksjon"
      );
    }
  }

  // ── Gruppe: Vinduer — isolasjon ──
  if (kat.has("glass") || kat.has("tetting")) {
    risikoElementer.push("redusert isolasjonsevne og økt energitap");
  }

  // ── Gruppe: Vinduer — karm/fukt ──
  if (kat.has("karm")) {
    risikoElementer.push("fuktskade i karm og tilstøtende veggkonstruksjon");
  }

  // ── Gruppe: Taktekking ──
  if (kat.has("stein") || kat.has("skade") || kat.has("papp") || kat.has("plater")) {
    risikoElementer.push("vanninntrengning gjennom skadet taktekking");
  }

  // ── Gruppe: Mose/begroing ──
  if (kat.has("mose")) {
    risikoElementer.push("akselerert nedbrytning av tekkingen");
  }

  // ── Gruppe: Beslag ──
  if (kat.has("beslag")) {
    risikoElementer.push("fuktinntrengning ved utsatte overganger");
  }

  // ── Gruppe: Alder/levetid ──
  // Forsiktigere språk når alder er eneste observasjon
  if (kat.has("alder")) {
    if (harKonkretSymptom) {
      risikoElementer.push("redusert gjenværende levetid");
    } else {
      risikoElementer.push(
        "usikkerhet knyttet til gjenværende levetid og komponentens tilstand"
      );
    }
  }

  // ── Gruppe: Pumpe ──
  if (kat.has("pumpe")) {
    risikoElementer.push("tilbakeslag av vann ved svikt i pumpesystem");
  }

  // ── Gruppe: Overflateskade (innvendige) ──
  if (kat.has("overflateskade")) {
    risikoElementer.push("skjulte fukt- eller konstruksjonsskader bak synlig overflatesvekkelse");
  }

  // ── Gruppe: Rekkverk/sikkerhet ──
  if (kat.has("rekkverk")) {
    risikoElementer.push("redusert sikring som bør vurderes nærmere");
  }

  // ── Gruppe: Konstruktiv nedbøyning/svikt ──
  if (kat.has("nedboyning")) {
    risikoElementer.push("konstruktiv svekkelse som bør avklares av fagkyndig");
  }

  // ── Gruppe: Rørsystem ──
  if (kat.has("ror") || kat.has("korrosjon") || kat.has("tank")) {
    // Kun hvis fukt/lekkasje ikke allerede dekker det
    if (!kat.has("fukt") && !kat.has("lekkasje")) {
      risikoElementer.push("svekkelse i rørsystem eller installasjoner som kan føre til lekkasje");
    }
  }

  // ── Gruppe: Ventilasjon/inneklima ──
  if (kat.has("anlegg") || kat.has("avtrekk")) {
    // Kun hvis fukt ikke allerede dekker det
    if (!kat.has("fukt")) {
      risikoElementer.push("utilstrekkelig ventilasjon som kan påvirke inneklima og fuktbelastning");
    }
  }

  // ── Gruppe: Lyd/vibrasjon (etasjeskiller, trapp) ──
  if (kat.has("lyd")) {
    risikoElementer.push("mulig konstruktiv bevegelse som bør vurderes");
  }

  // Ingen kategorier matchet
  if (risikoElementer.length === 0) {
    if (referanse) {
      return kort ? lagKortKjerne(referanse) : referanse;
    }
    return "Forholdet som er observert kan medføre følgeskader dersom det ikke utbedres.";
  }

  if (kort) {
    return `Uten utbedring er det risiko for ${risikoElementer[0]}.`;
  }

  if (risikoElementer.length === 1) {
    return `Uten utbedring er det risiko for ${risikoElementer[0]}. Dersom forholdet vedvarer, kan skadeomfanget øke.`;
  }

  // Flerleddet risiko: "x, y og z"
  const siste = risikoElementer[risikoElementer.length - 1];
  const forrige = risikoElementer.slice(0, -1);
  return `Uten utbedring er det risiko for ${forrige.join(", ")} og ${siste}.`;
}

/**
 * KONSEKVENS — kostnadsinformasjon for kjøper.
 *
 * Konsekvens er standardisert (handler om kostnader, ikke observasjonsspesifikt).
 * Ved god dekning: bruk TG-spesifikk konsekvens fra terminologien.
 * Ved svak dekning: bruk trygg generisk tekst (aldri domene-spesifikk uten dekning).
 */
function byggKonsekvens(
  analyse: ObservasjonsAnalyse,
  tgData: TgTerminologi,
  ueLabel: string,
  kort: boolean
): string {
  if (kort) {
    return `Kjøper bør påregne kostnad til utbedring av ${ueLabel.toLowerCase()}.`;
  }

  // God dekning: vi vet observasjonen matcher underenhetens domene,
  // så TG-spesifikk konsekvens er relevant og trygg å bruke
  if (analyse.dekning === "god" && tgData.konsekvenser.length > 0) {
    // Forsøk å finne en referanse som matcher observasjonens tema
    const ref = finnRelevantReferanse(tgData.konsekvenser, analyse);
    if (ref) return ref;
    // Fallback til første (mest generelle) konsekvens for denne TG
    return tgData.konsekvenser[0];
  }

  // Svak dekning: trygg generisk tekst som ikke påstår noe utover observasjonen
  return `Kjøper bør påregne kostnad til utbedring av ${ueLabel.toLowerCase()}. ` +
    `Omfanget bør kartlegges nærmere for å avklare hva utbedringen innebærer.`;
}

/**
 * TILTAK — anbefalt utbedring.
 *
 * Samme logikk som konsekvens: TG-data ved god dekning, generisk ved svak.
 */
function byggTiltak(
  analyse: ObservasjonsAnalyse,
  tgData: TgTerminologi,
  ueLabel: string,
  input: ArkatGenerateInput,
  kort: boolean
): string {
  let tiltak: string;

  if (analyse.dekning === "god" && tgData.tiltak.length > 0) {
    const ref = finnRelevantReferanse(tgData.tiltak, analyse);
    if (ref) {
      tiltak = kort ? lagKortKjerne(ref) : ref;
    } else {
      // Første tiltak er typisk det mest generelle
      tiltak = kort ? lagKortKjerne(tgData.tiltak[0]) : tgData.tiltak[0];
    }
  } else {
    tiltak = kort
      ? `Utbedring av ${ueLabel.toLowerCase()} anbefales. Innhent vurdering fra kvalifisert fagperson.`
      : `Det anbefales utbedring av ${ueLabel.toLowerCase()}. Innhent vurdering og tilbud fra kvalifisert fagperson for å avklare omfang og utbedringsmetode.`;
  }

  // Hastegrad — som separat setning, aldri midt i eksisterende tekst
  if (input.akuttgrad === "haster") {
    tiltak += " Tiltaket bør iverksettes umiddelbart.";
  } else if (input.akuttgrad === "bor_folges_opp") {
    tiltak += " Oppfølging anbefales innen rimelig tid.";
  }

  return tiltak;
}

// ─── Hjelpefunksjoner ───────────────────────────────────────

const STOPPORD = new Set([
  "det", "er", "en", "et", "og", "av", "for", "som", "med", "til",
  "fra", "ved", "har", "kan", "bli", "var", "den", "ikke", "seg",
  "vil", "skal", "over", "etter", "under", "inn", "ut",
  "der", "her", "hva", "når", "hvor", "noe", "alle", "noen",
  "andre", "denne", "disse", "sin", "sitt", "sine", "blir",
  "ble", "blitt", "vært", "eller", "men", "også", "bare",
]);

function extraherSignifikanteOrd(tekst: string): string[] {
  return tekst
    .replace(/[.,;:!?()[\]{}«»"']/g, " ")
    .split(/\s+/)
    .filter((ord) => ord.length > 3 && !STOPPORD.has(ord));
}

/**
 * Konverter observasjonstekst til en kjerne egnet for innbygging i setning.
 * Fjerner ledende faglige prefix-fraser for å unngå dobbelt prefix.
 * Håndterer flersetnings-input korrekt.
 */
function lavKjerne(obs: string): string {
  let k = obs.trim();

  // Fjern vanlige prefix-fraser (rekkefølge: lengste først)
  const prefixer = [
    /^det er blitt (observert|registrert|påvist)\s+(at\s+)?/i,
    /^det ble (observert|registrert|påvist)\s+(at\s+)?/i,
    /^det er (observert|registrert|påvist|konstatert|notert)\s+(at\s+)?/i,
    /^det (observeres|registreres|påvises)\s+(at\s+)?/i,
    /^vi har (observert|registrert|påvist)\s+(at\s+)?/i,
    /^(observert|registrert|påvist|konstatert)\s+/i,
  ];
  for (const p of prefixer) {
    const before = k;
    k = k.replace(p, "");
    if (k !== before) break; // Bare fjern én prefix
  }

  // Liten forbokstav etter fjerning
  if (k.length > 0) {
    k = k[0].toLowerCase() + k.slice(1);
  }

  // Fjern trailing punktum KUN hvis det er én setning
  // Flersetnings-input beholder sin struktur
  const antallPunktum = (k.match(/\./g) || []).length;
  if (antallPunktum <= 1 && k.endsWith(".")) {
    k = k.slice(0, -1);
  }

  return k;
}

/** Sørg for at teksten ender med punktum */
function avsluttSetning(tekst: string): string {
  const trimmed = tekst.trim();
  if (!trimmed) return trimmed;
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return trimmed + ".";
}

/** Lag kort versjon av en tekst (maks 2 setninger) */
function lagKortKjerne(tekst: string): string {
  const setninger = tekst.split(/(?<=[.!?])\s+/);
  if (setninger.length <= 2) return tekst;
  return setninger.slice(0, 2).join(" ");
}

export { harTerminologidekning };
