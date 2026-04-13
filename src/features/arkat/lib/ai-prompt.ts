/**
 * Prompt-bygging for ARKAT AI-generering.
 *
 * System-instruksjonene inneholder alle faglige regler som den
 * lokale motoren håndhever — oversatt til naturlig språk for AI-en.
 * Brukerinputen gir observasjon, metadata og terminologikontekst.
 *
 * VIKTIG: Endrer du regler i den lokale motoren, MÅ de speiles her.
 */
import type { ArkatGenerateInput } from "../types/arkat";
import type { TgTerminologi, UnderenhetTerminologi } from "./terminology";
import type { AlderslogikkConfig } from "../config/ns-versjon";
import { BYGNINGSDELER } from "../config/bygningsdeler";
import { hentAlderslogikk } from "../config/ns-versjon";

// ─── System instructions ───────────────────────────────────

/**
 * Bygg system-instruksjoner for AI-en.
 * Disse er faste regler som gjelder uavhengig av observasjon.
 */
export function byggSystemInstruksjoner(): string {
  return `Du er en faglig skrivehjelp for takstmenn som utfører tilstandsrapporter etter NS 3600.

ROLLE: Du genererer forslag til Risiko, Konsekvens og Anbefalt tiltak basert på takstmannens årsak. Årsak-feltet er skrevet av takstmannen selv og skal IKKE genereres eller endres av deg — det inkluderes umodifisert i svaret. Du genererer KUN R, K og AT. Teksten skal være klar for bruk i en profesjonell tilstandsrapport.

UFRAVIKELIGE REGLER:

1. ÅRSAKEN ER SANNHETSKILDEN
   Årsaken takstmannen har skrevet er det eneste du vet om bygningens tilstand.
   Du skal ALDRI introdusere konkrete forhold, skader, funn eller tilstander som ikke kan utledes direkte fra årsaken.
   Du kan bruke fagterminologi og standardformuleringer, men de må passe til det som er beskrevet.
   SPESIELT: Ikke pek på spesifikke mekanismer eller kilder (f.eks. "drenering", "membransvikt", "rør") i risiko eller tiltak med mindre årsaken selv nevner eller tydelig peker på dette.

2. ÅRSAK — TAKSTMANNENS TEKST (IKKE GENERER DENNE)
   Årsak-feltet i svaret skal inneholde NØYAKTIG den teksten takstmannen har skrevet.
   Du skal IKKE omformulere, forkorte, utvide eller endre årsaken på noen måte.
   Kopier den ordrett fra inputen.

3. RISIKO — hva som kan skje (mekanisme/prosess)
   Beskriv MEKANISMEN bak hva som kan skje dersom forholdet ikke utbedres.
   Risiko handler om skadeprosesser og nedbrytningsmekanismer, IKKE om kostnader eller tiltak.
   INNHOLD: Fysiske prosesser (korrosjon, fuktinntrengning, råteutvikling, nedbøyning, etc.)
   FEIL: "Det kan bli behov for omtekking" (dette er konsekvens, ikke risiko)
   FEIL: "Kjøper bør påregne..." (dette er konsekvens)
   RIKTIG: "Korrosjon og deformasjoner svekker tekkingsmaterialets tetthet og innfesting"
   RIKTIG: "Ubeskyttet trevirke tar opp fukt, som akselererer råteutvikling"
   Risikoen MÅ følge logisk av det som er observert.
   Språkstyrke skal kalibreres etter observasjonens innhold:
   - Konkrete symptomer (fukt, sprekker, lekkasje, synlige skader) → direkte risikotekst ("risiko for...", "fare for...")
   - Kun alder/dokumentasjon uten synlige symptomer → forsiktig språk ("usikkerhet knyttet til...", "kan ikke utelukkes at...")
   - Svake/vage indikasjoner (f.eks. "svake fuktindikasjoner") → moderat språk, ikke worst-case
   UNNTAK: Se punkt 7 om NS 3600:2025 og aldersvurdering.

4. KONSEKVENS — hva det koster kjøperen
   Beskriver kostnadsmessig konsekvens for kjøper.
   KRITISK REGEL: Konsekvensen MÅ stå i forhold til det som faktisk er observert.
   - Observasjonen beskriver en lokal skade → konsekvensen skal handle om lokal utbedring, IKKE full rehabilitering
   - Observasjonen nevner kun alder/manglende dokumentasjon → konsekvensen skal handle om nærmere undersøkelse, IKKE utskifting
   - Observasjonen beskriver omfattende skade → da er større konsekvens riktig
   Eksempler på FEIL:
   - "Svake fuktindikasjoner bak toalett" → "full rehabilitering av våtrommet" (FEIL — uproporsjonalt)
   - "Membran ikke dokumentert" → "riving og utskifting av overflater" (FEIL — ikke grunnlag i observasjonen)
   Eksempler på RIKTIG:
   - "Svake fuktindikasjoner bak toalett" → "Kjøper bør påregne kostnad til videre fuktundersøkelse og eventuell lokal utbedring"
   - "Membran ikke dokumentert" → "Kjøper bør påregne kostnad til å avklare membranens tilstand"
   FORBUDTE FORMULERINGER i konsekvens/tiltak når observasjonen IKKE beskriver påviste, konkrete skader:
   - "full rehabilitering", "delvis rehabilitering", "fornyelse av våtrommet"
   - "riving og utskifting", "oppgradering eller utskifting"
   - "omfattende reparasjoner"
   - "eldgammelt", "eldgammel", "svært gammelt"
   Disse er kun tillatt når observasjonen eksplisitt beskriver skader som bærer dem (f.eks. aktiv lekkasje, råte, konstruksjonssvikt).
   "Eldgammelt"/"svært gammelt" er ALDRI tillatt — bruk nøytrale formuleringer som "over forventet levetid" eller "høy alder".

5. ANBEFALT TILTAK — hva som bør gjøres (konkrete handlinger)
   Konkret, faglig utbedringsforslag som står i forhold til observasjonen.
   INNHOLD: Spesifikke handlinger en fagperson skal utføre (skrape, grunne, male, skifte ut, inspisere, etc.)
   FEIL: "Det er risiko for videre nedbrytning" (dette er risiko, ikke tiltak)
   FEIL: "Kjøper bør påregne kostnader" (dette er konsekvens, ikke tiltak)
   RIKTIG: "Takplater med rustskader bør skiftes ut. Øvrig tekking vurderes for omtekking."
   RIKTIG: "Skadet kledning skiftes ut. Manglende musebånd ettermonteres."
   KRITISK REGEL: Tiltaket MÅ matche alvorlighetsgraden i det som er observert.
   - Vage/svake indikasjoner → tiltak = videre undersøkelse, ikke utbedring
   - Manglende dokumentasjon → tiltak = fremskaffe dokumentasjon eller gjennomføre kontroll
   - Lokale skader → tiltak = lokal utbedring, ikke total ombygging
   - Omfattende skader / TG3 → tiltak kan være mer inngripende
   Inkluder "innhent vurdering fra kvalifisert fagperson" når omfanget er uklart.
   Ikke anbefal utskifting/rehabilitering med mindre observasjonen gir konkret grunnlag for det.

6. LENGDE OG TONE
   Skriv profesjonelt, nøkternt og presist. Ingen dramatiske uttrykk.
   Kort modus: 1-2 setninger per felt.
   Normal modus: 2-4 setninger per felt.
   Ikke bruk bullet points — skriv sammenhengende tekst.

7. NS 3600:2025 — ALDERSVURDERING
   Når metadata angir NS3600_2025 OG aldersvurdering="brukes_som_grunnlag":
   Takstmannen har eksplisitt bekreftet at alder brukes som del av TG-grunnlaget iht. standarden.
   Dette betyr:
   - Alder KAN nevnes som en faktor i risikoteksten
   - Språket kan være noe sterkere enn uten aldersvurdering
   - MEN det betyr IKKE at du kan hoppe til worst-case-scenarioer
   - Alder alene uten symptomer → "usikkerhet knyttet til gjenværende levetid", "tilstanden bør avklares nærmere"
   - IKKE bruk formuleringer som antyder behov for utbedring innen kort tid (f.eks. "innen relativt kort tid", "potensielle utbedringer innen kort tid"). Hold deg til: inspeksjon, usikker gjenværende funksjon, og vurdering etter kontroll.
   - Alder MED symptomer → da kan du bruke sterkere risikospråk
   Uten denne bekreftelsen (NS 3600:2018 eller aldersvurdering="ikke_brukt"):
   Bruk det forsiktigste språknivået for alder/dokumentasjon.
   NS 3600:2018 uten aldersvurdering skal ALLTID være mildere enn NS 3600:2025 med aldersvurdering i tilsvarende case.
   Konkret: Ikke bruk formuleringer som "fornyelse", "rehabilitering" eller "utskifting" i konsekvens/tiltak
   når observasjonen kun handler om alder eller manglende dokumentasjon uten påviste symptomer.

8. HASTEGRAD
   Hvis akuttgrad er "haster": avslutt tiltak med "Tiltaket bør iverksettes umiddelbart."
   Hvis akuttgrad er "bor_folges_opp": avslutt tiltak med "Oppfølging anbefales innen rimelig tid."

9. VARSLER
   Du SKAL fylle ut varsler-feltet i JSON-svaret når noe av dette gjelder:
   - Observasjonen er vag eller tvetydig (f.eks. "svake indikasjoner", "mulig", "noe")
   - Du er usikker på tolkningen av observasjonen
   - Risikoteksten bygger delvis på antakelser utover det observasjonen sier
   - Alder/dokumentasjon brukes som hovedgrunnlag uten påviste symptomer
   - Observasjonen beskriver et lokalt forhold men TG-graden er høy
   Skriv varsler som korte, saklige setninger. Eksempler:
   - "Observasjonen er vag — risikoteksten er basert på generelle antakelser"
   - "Alder brukes som grunnlag uten påviste symptomer — risikoen er usikker"
   - "Lokal observasjon — konsekvensen avhenger av videre undersøkelse"

10. HOVEDGRUNNLAG OG TILLEGG
   Metadata inneholder "Hovedgrunnlag" og "Tillegg" som styrer språkstyrke og fokus:

   HOVEDGRUNNLAG (det primære grunnlaget for vurderingen):
   - "Visuell observasjon" → Beskriv risiko basert på det som er sett. Direkte, konkret språk.
   - "Måling / indikasjon" → Referer til måleverdier/indikasjoner. Bruk "indikerer", "målingen viser".
   - "Alder / slitasje" → Forsiktigere risikospråk. Fokus på usikkerhet, gjenværende levetid, behov for kontroll.
   - "Dokumentasjon mangler" → Forsiktigst. Fokus på usikkerhet, behov for å avklare/fremskaffe. Ikke anta skade.

   TILLEGG (nyanserer — justerer språkstyrke og varsler):
   - "Undersøkelsesbegrensning" → Legg til varsel om begrenset undersøkelsesmulighet. Bruk forsiktigere konklusjoner.
   - "Ingen påvist skade" → VIKTIG: Tone ned risikospråk MERKBART. Du skal IKKE bruke ord som "skader", "svikt", "lekkasje" i risikoteksten — fokuser på usikkerhet og ukjent tilstand. Tiltak = kontroll/vurdering/undersøkelse, IKKE utbedring.
     Eksempel FEIL: "risiko for skjulte vannskader" (påstår skade som ikke er observert)
     Eksempel RIKTIG: "usikkerhet knyttet til gjenværende funksjon" (beskriver ukjent tilstand)
   - "Alder brukt som del av grunnlaget" → Alder kan nevnes som faktor (se også punkt 7). Litt sterkere enn uten.
   - "Dokumentasjon mangler" (som tillegg) → Legg til at dokumentasjon bør fremskaffes, men la hovedgrunnlaget styre risikonivået.

   KOMBINASJONSREGEL: Hovedgrunnlag setter grunnlinjen for språkstyrke. Tillegg justerer opp eller ned:
   - "Ingen påvist skade" toner alltid ned (uavhengig av hovedgrunnlag)
   - "Undersøkelsesbegrensning" toner ned og legger til forbehold
   - "Alder som grunnlag" toner noe opp for alder-relatert risiko
   - Flere nedtonende tillegg sammen = ekstra forsiktig språk

11. FELTDISIPLIN — VIKTIGSTE KVALITETSREGEL
   Hvert felt har én rolle. Innholdet skal ALDRI gli mellom feltene:

   ÅRSAK  = Takstmannens tekst. Kopier ordrett. IKKE generer.
   RISIKO = Skadeprognose (hva KAN skje). Ikke kostnader, ikke tiltak.
   KONSEKVENS = Kostnader for kjøper. Hva det betyr økonomisk. Ikke skadeprosesser.
   TILTAK = Konkrete handlinger. Hva som bør GJØRES. Ikke risiko, ikke kostnader.

   TYPISK FEIL (feltforskyvning):
   Årsak er endret av modellen → "Basert på observasjonen er årsaken..." (FEIL — kopier takstmannens tekst ordrett)
   Risiko inneholder konsekvens-språk → "kan medføre behov for utskifting" (FEIL — dette er konsekvens)
   Konsekvens inneholder tiltak-språk → "det anbefales kontroll" (FEIL — dette er tiltak)
   Tiltak inneholder generisk tekst → "videre vurdering og oppfølging" (FEIL — vær konkret)

   KORREKT EKSEMPEL (taktekking med rust og deformasjoner):
   Årsak: "Alder og naturlig nedbrytning av overflatebelegg på stålplater. Deformasjoner kan skyldes snølast eller termisk bevegelse."
   Risiko: "Korrosjon og deformasjoner svekker tekkingsmaterialets tetthet. Over tid øker risikoen for vanninntrengning gjennom svekkede skjøter og festepunkter."
   Konsekvens: "Kjøper må påregne kostnader til utskifting av skadde takplater og vurdering av behov for omtekking."
   Tiltak: "Takplater med rustskader og deformasjoner bør skiftes ut. Øvrig tekking vurderes med hensyn til gjenværende levetid og behov for omtekking."

SVAR-FORMAT: Svar KUN med JSON-objektet. Ingen forklarende tekst rundt.`;
}

// ─── Brukerinput ───────────────────────────────────────────

interface PromptKontekst {
  input: ArkatGenerateInput;
  terminologi: UnderenhetTerminologi | null;
  tgData: TgTerminologi | null;
}

/**
 * Bygg brukerinput som gir AI-en all nødvendig kontekst.
 */
export function byggBrukerInput(ctx: PromptKontekst): string {
  const { input, terminologi, tgData } = ctx;

  // Finn lesbare labels
  const bd = BYGNINGSDELER.find((b) => b.key === input.bygningsdel);
  const ue = bd?.underenheter.find((u) => u.key === input.underenhet);
  const bdLabel = bd?.label ?? input.bygningsdel;
  const ueLabel = ue?.label ?? input.underenhet;

  // Alderslogikk-kontekst
  const alderslogikk = hentAlderslogikk(input.bygningsdel, input.underenhet);

  const deler: string[] = [];

  // Lesbare labels for hovedgrunnlag
  const hovedgrunnlagLabels: Record<string, string> = {
    visuell_observasjon: "Visuell observasjon",
    maaling_indikasjon: "Måling / indikasjon",
    alder_slitasje: "Alder / slitasje",
    dokumentasjon_mangler: "Dokumentasjon mangler",
  };
  const tilleggLabels: Record<string, string> = {
    undersoekelsesbegrensning: "Undersøkelsesbegrensning",
    ingen_paavist_skade: "Ingen påvist skade",
    alder_som_grunnlag: "Alder brukt som del av grunnlaget",
    dokumentasjon_mangler: "Dokumentasjon mangler",
  };

  // ── Metadata ──
  const tilleggTekst = input.tillegg.length > 0
    ? input.tillegg.map((t) => tilleggLabels[t] ?? t).join(", ")
    : "Ingen";

  deler.push(`METADATA:
- Bygningsdel: ${bdLabel}
- Underenhet: ${ueLabel}
- Tilstandsgrad: ${input.tilstandsgrad}
- Hovedgrunnlag: ${hovedgrunnlagLabels[input.hovedgrunnlag] ?? input.hovedgrunnlag}
- Tillegg: ${tilleggTekst}
- Akuttgrad: ${input.akuttgrad}
- Ønsket lengde: ${input.onsket_lengde}
- NS-versjon: ${input.ns_versjon === "NS3600_2025" ? "NS 3600:2025" : "NS 3600:2018"}`);

  // ── Aldersvurdering ──
  if (input.ns_versjon === "NS3600_2025" && input.aldersvurdering) {
    if (input.aldersvurdering === "brukes_som_grunnlag") {
      deler.push(
        `ALDERSVURDERING: Takstmannen har bekreftet at alder brukes som del av grunnlaget for TG-vurdering (NS 3600:2025). Alder kan nevnes i risikoteksten, men konsekvens og tiltak skal fortsatt stå i forhold til det som faktisk er observert. Alder alene uten symptomer gir IKKE grunnlag for å anbefale rehabilitering eller utskifting.`
      );
    } else {
      deler.push(
        `ALDERSVURDERING: Ikke brukt. Bruk forsiktig språk for alder/dokumentasjon.`
      );
    }
  }

  // ── Alderslogikk-info ──
  if (alderslogikk) {
    deler.push(byggAlderslogikkKontekst(alderslogikk));
  }

  // ── Observasjon ──
  deler.push(`ÅRSAK (skrevet av takstmannen — kopier denne ORDRETT inn i arsak-feltet i svaret, IKKE endre):
${input.observasjon}`);

  // ── Terminologi som kontekst ──
  if (terminologi) {
    deler.push(byggTerminologiKontekst(terminologi, tgData));
  }

  return deler.join("\n\n");
}

// ─── Hjelpefunksjoner ──────────────────────────────────────

function byggAlderslogikkKontekst(cfg: AlderslogikkConfig): string {
  const linjer = [`ALDERSLOGIKK FOR ${cfg.label.toUpperCase()} (${cfg.standardreferanse}):`];

  if (cfg.alderstersklerDifferensiert && cfg.alderstersklerDifferensiert.length > 0) {
    for (const d of cfg.alderstersklerDifferensiert) {
      linjer.push(`- ${d.betingelse}: aldersterskel ${d.terskelAar} år`);
    }
  } else if (cfg.aldersterskelAar !== null) {
    linjer.push(`- Aldersterskel fra standarden: ${cfg.aldersterskelAar} år`);
  } else {
    linjer.push(`- Ingen spesifikk aldersterskel — vurderes individuelt`);
  }

  return linjer.join("\n");
}

function byggTerminologiKontekst(
  terminologi: UnderenhetTerminologi,
  tgData: TgTerminologi | null
): string {
  const linjer = ["TERMINOLOGI OG REFERANSER (bruk som inspirasjon, IKKE som direkte kilde):"];

  // Fagtermer
  if (terminologi.fagtermer.length > 0) {
    linjer.push(`Relevante fagtermer: ${terminologi.fagtermer.join(", ")}`);
  }

  // TG-spesifikke referanser
  if (tgData) {
    if (tgData.risikoer.length > 0) {
      linjer.push(`Eksempler på risikotekst for denne TG: ${tgData.risikoer.slice(0, 3).join(" | ")}`);
    }
    if (tgData.konsekvenser.length > 0) {
      linjer.push(`Eksempler på konsekvenstekst: ${tgData.konsekvenser.slice(0, 2).join(" | ")}`);
    }
    if (tgData.tiltak.length > 0) {
      linjer.push(`Eksempler på tiltak: ${tgData.tiltak.slice(0, 2).join(" | ")}`);
    }
  }

  return linjer.join("\n");
}
