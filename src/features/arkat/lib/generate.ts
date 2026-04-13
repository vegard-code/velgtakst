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
  hentMerknadTerminologi,
  finnObservasjonsMatch,
  harTerminologidekning,
} from "./terminology";
import type { TgTerminologi, MerknadTerminologi, UnderenhetTerminologi } from "./terminology";
import { erMerknadModus } from "../config/bygningsdeler";
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

  // ── Merknad-modus (f.eks. elektrisk anlegg, rekkverk/åpninger) ──
  if (erMerknadModus(input.bygningsdel, input.underenhet, input.submodus)) {
    return genererMerknad(input, terminologi);
  }

  const tgData = input.tilstandsgrad
    ? hentTgTerminologi(input.bygningsdel, input.underenhet, input.tilstandsgrad)
    : null;

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
  const result = byggArkat(input, analyse, tgData, terminologi);

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

// ─── Merknad-modus (el-anlegg etc.) ────────────────────────

/**
 * Generer merknad/konsekvens/tiltak for underenheter uten TG.
 *
 * Prinsipp: Ekstra konservativ. Ingen el-faglige konklusjoner.
 * Tiltak peker alltid mot kontroll av autorisert fagperson.
 * Akuttgrad justerer bare hastigheten i anbefalingen, ikke konklusjonen.
 */
async function genererMerknad(
  input: ArkatGenerateInput,
  terminologi: UnderenhetTerminologi | null
): Promise<ArkatGenerateResponse> {
  const merknadData = terminologi
    ? hentMerknadTerminologi(input.bygningsdel, input.underenhet, input.submodus)
    : null;

  if (!terminologi || !merknadData) {
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

  // Analyser observasjonen mot markører
  const obs = input.observasjon.trim();
  const matches = finnObservasjonsMatch(terminologi, obs);

  if (matches.length === 0) {
    // Sjekk fagtermer som fallback
    const obsLower = obs.toLowerCase();
    const harFagterm = terminologi.fagtermer.some((t) =>
      obsLower.includes(t.toLowerCase())
    );
    if (!harFagterm || obs.length < 50) {
      return {
        success: false,
        screening: {
          approved_for_generation: false,
          reason:
            "Observasjonen inneholder ikke nok gjenkjennelige detaljer. " +
            "Beskriv konkret hva som er observert.",
          warnings: [],
        },
        result: null,
      };
    }
  }

  // Bygg merknad — basert direkte på observasjonen
  const merknad = byggMerknadTekst(obs, merknadData, matches);
  const konsekvens = finnRelevantMerknadRef(merknadData.konsekvenser, obs) ?? merknadData.konsekvenser[0];
  let tiltak = finnRelevantMerknadRef(merknadData.tiltak, obs) ?? merknadData.tiltak[0];

  // Akuttgrad — kun mild hastighetsmodifisering
  if (input.akuttgrad === "haster") {
    tiltak += " Kontroll bør prioriteres.";
  } else if (input.akuttgrad === "bor_folges_opp") {
    tiltak += " Kontroll anbefales innen rimelig tid.";
  }

  return {
    success: true,
    screening: {
      approved_for_generation: true,
      reason: null,
      warnings: matches.length < 2
        ? ["Observasjonen gir begrenset grunnlag for detaljert merknad. Mer spesifikke detaljer ville gitt bedre resultat."]
        : [],
    },
    result: {
      arsak: merknad,        // Vises som "Merknad" i UI
      risiko: "",             // Ikke brukt i merknad-modus
      konsekvens,
      anbefalt_tiltak: tiltak,
      modus: "merknad",
    },
  };
}

/**
 * Bygg merknadstekst fra observasjonen.
 * Reformulerer observasjonen minimalt, uten å trekke el-faglige konklusjoner.
 */
function byggMerknadTekst(
  obs: string,
  merknadData: MerknadTerminologi,
  matches: { kategori: string; treff: string[] }[]
): string {
  // Sjekk om observasjonen allerede er en fullstendig setning
  const erFullSetning =
    /\b(har|er|viser|mangler|fremstår|fungerer|tyder)\b/i.test(obs);

  let tekst: string;
  if (erFullSetning) {
    tekst = avsluttSetning(obs);
  } else {
    tekst = avsluttSetning(`Det er registrert ${obs[0].toLowerCase() + obs.slice(1)}`);
  }

  // Legg til konservativ avslutning KUN når observasjonen er kort/vag.
  // Konkrete observasjoner (>80 tegn eller 2+ setninger) skal stå som de er —
  // vurderinger hører hjemme i Konsekvens og Anbefalt tiltak, ikke i Merknad.
  const antallSetninger = (obs.match(/[.!?]\s+[A-ZÆØÅ]/g) || []).length + 1;
  const erKonkretNok = obs.length > 80 || antallSetninger >= 2;

  if (!erKonkretNok && matches.length >= 1) {
    const ref = finnRelevantMerknadRef(merknadData.merknader, obs);
    if (ref && ref !== tekst) {
      tekst += ` ${ref.charAt(0).toUpperCase() + ref.slice(1)}`;
      tekst = tekst.replace(/\.\s*\./g, ".").trim();
    }
  }

  return tekst;
}

/**
 * Finn merknad-referanse som matcher observasjonen best.
 * Enklere versjon av finnRelevantReferanse — bruker ordoverlapp.
 */
function finnRelevantMerknadRef(
  kandidater: string[],
  obs: string
): string | null {
  if (kandidater.length === 0) return null;

  const obsOrd = obs.toLowerCase()
    .replace(/[.,;:!?()[\]{}«»"']/g, " ")
    .split(/\s+/)
    .filter((ord) => ord.length > 3);

  let bestScore = 0;
  let best: string | null = null;

  for (const k of kandidater) {
    const kLower = k.toLowerCase();
    let score = 0;
    for (const ord of obsOrd) {
      if (kLower.includes(ord)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }

  return bestScore >= 2 ? best : null;
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
  tgData: TgTerminologi,
  _terminologi: UnderenhetTerminologi | null
): ArkatGeneratedResult {
  const erKort = input.onsket_lengde === "kort";
  const bd = BYGNINGSDELER.find((b) => b.key === input.bygningsdel);
  const ue = bd?.underenheter.find((u) => u.key === input.underenhet);
  const ueLabel = ue?.label ?? input.underenhet;

  // Referanser — brukes KUN som strukturmal, aldri som direkte kilde
  const risikoRef = finnRelevantReferanse(tgData.risikoer, analyse);

  // Årsak = brukerens input direkte (ikke generert)
  const arsak = avsluttSetning(input.observasjon.trim());
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
 * ÅRSAK — forklarer HVORFOR tilstanden har oppstått.
 *
 * Årsak skal IKKE gjenta observasjonen — den skal forklare mekanismene
 * bak det som er observert. "Hva har ført til denne tilstanden?"
 *
 * Logikk:
 * 1. Slå opp årsaksmekanismer fra terminologien basert på matchede kategorier
 * 2. Dedupliser og komponer til sammenhengende tekst (maks 2-3 setninger)
 * 3. Fallback: reformuler observasjonen dersom ingen mekanismer finnes
 */
function byggArsak(
  analyse: ObservasjonsAnalyse,
  ueLabel: string,
  kort: boolean,
  terminologi: UnderenhetTerminologi | null
): string {
  const obs = analyse.kjerne.trim();

  // Forsøk mekanisme-basert årsak fra terminologien
  const mekanismer = terminologi?.aarsaksmekanismer;
  if (mekanismer && analyse.matchKategorier.length > 0) {
    const tekster: string[] = [];
    const sett = new Set<string>(); // dedupliser identiske tekster

    // Prioriter "alder" først (grunnårsak), deretter spesifikke mekanismer
    const sortert = [...analyse.matchKategorier].sort((a, b) =>
      a === "alder" ? -1 : b === "alder" ? 1 : 0
    );

    for (const kat of sortert) {
      const tekst = mekanismer[kat];
      if (tekst && !sett.has(tekst)) {
        sett.add(tekst);
        tekster.push(tekst);
      }
    }

    if (tekster.length > 0) {
      // Maks 3 mekanismer for lesbarhet
      const bruk = tekster.slice(0, 3);
      if (kort) return bruk[0];
      return bruk.join(" ");
    }
  }

  // Fallback: reformuler observasjonen (for underenheter uten årsaksmekanismer)
  if (kort) {
    return avsluttSetning(lagKortKjerne(obs));
  }

  const harFagligPrefix =
    /^(det er |det ble |vi har )?(observert|registrert|påvist|konstatert)/i.test(obs);
  const erFullSetning =
    /\b(har|er|viser|mangler|innebærer|medfører|tyder|indikerer|fremstår|fungerer|ligger)\b/i.test(obs);

  let arsak: string;
  if (harFagligPrefix || erFullSetning) {
    arsak = avsluttSetning(obs);
  } else {
    arsak = avsluttSetning(`Det er registrert ${lavKjerne(obs)}`);
  }

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
    "rust", "skadedyr", "sopp", "raate", "maling", "kledning",
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

  // ── Gruppe: Rust/korrosjon på taktekking ──
  if (kat.has("rust")) {
    // Kun hvis ikke allerede dekket av stein/skade/plater (taktekking-gruppen)
    if (!kat.has("stein") && !kat.has("skade") && !kat.has("plater")) {
      risikoElementer.push("videre korrosjon som svekker tekkingsmaterialets tetthet og innfesting");
    }
  }

  // ── Gruppe: Skadedyr/mus ──
  if (kat.has("skadedyr")) {
    risikoElementer.push("inntrenging av skadedyr bak kledning");
  }

  // ── Gruppe: Svertesopp/begroing på fasade ──
  if (kat.has("sopp")) {
    // Kun hvis fukt ikke allerede dekker det
    if (!kat.has("fukt")) {
      risikoElementer.push("fuktpåvirkning med soppvekst og akselerert nedbrytning");
    }
  }

  // ── Gruppe: Råteskade i kledning ──
  if (kat.has("raate")) {
    // Kun hvis fukt ikke allerede dekker det
    if (!kat.has("fukt") && !kat.has("lekkasje")) {
      risikoElementer.push("videre råteutvikling i trevirke og underliggende konstruksjon");
    }
  }

  // ── Gruppe: Maling/overflatebehandling ──
  if (kat.has("maling")) {
    // Kun hvis råte/fukt ikke allerede dekker det
    if (!kat.has("raate") && !kat.has("fukt")) {
      risikoElementer.push("ubeskyttet trevirke med økt fuktopptak og nedbrytning");
    }
  }

  // ── Gruppe: Kledning generelt ──
  if (kat.has("kledning")) {
    // Kun som fallback hvis ingen andre fasade-grupper matchet
    if (!kat.has("raate") && !kat.has("maling") && !kat.has("fukt") && !kat.has("skadedyr")) {
      risikoElementer.push("svekkelse i kledningens beskyttende funksjon");
    }
  }

  // ── Velg beste risikotekst ──
  // Kategoribygget risikotekst er ALLTID mer observasjonsnær enn referansetekst.
  // Referansetekst brukes KUN som absolutt fallback (ingen kategorier matchet).
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

  // Flerleddet risiko — maks 3 elementer, strukturert lesbart
  const bruk = risikoElementer.slice(0, 3);
  if (bruk.length === 2) {
    return `Uten utbedring er det risiko for ${bruk[0]}, samt ${bruk[1]}.`;
  }
  // 3 elementer: første setning med 2, andre med siste
  return `Uten utbedring er det risiko for ${bruk[0]} og ${bruk[1]}. I tillegg er det fare for ${bruk[2]}.`;
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

  // Forsøk alltid å finne referansetekst fra terminologien.
  // Konsekvens-tekster er kjøperorienterte og trygge å bruke
  // selv ved svak dekning — de handler om kostnader, ikke diagnose.
  if (tgData.konsekvenser.length > 0) {
    const ref = finnRelevantReferanse(tgData.konsekvenser, analyse);
    if (ref) return ref;
    return tgData.konsekvenser[0];
  }

  // Absolutt fallback når terminologien mangler konsekvenser
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

  // Forsøk alltid å finne en relevant referansetekst fra terminologien —
  // også ved svak dekning. Referansetekstene er faglig konkrete og mye
  // bedre enn den generiske fallbacken.
  if (tgData.tiltak.length > 0) {
    const ref = finnRelevantReferanse(tgData.tiltak, analyse);
    if (ref) {
      tiltak = kort ? lagKortKjerne(ref) : ref;
    } else {
      // Bruk første tiltak (mest generell) — fortsatt bedre enn ren fallback
      tiltak = kort ? lagKortKjerne(tgData.tiltak[0]) : tgData.tiltak[0];
    }
  } else {
    tiltak = kort
      ? `Utbedring av ${ueLabel.toLowerCase()} anbefales.`
      : `Det anbefales nærmere vurdering og utbedring av ${ueLabel.toLowerCase()} av kvalifisert fagperson.`;
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
