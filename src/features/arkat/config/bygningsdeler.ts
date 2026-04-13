/**
 * Konfigurasjon av bygningsdeler og underenheter for ARKAT v1.
 *
 * Strukturen er flat og enkel å utvide.
 * Rekkefølgen i listene styrer rekkefølgen i UI.
 */

export interface Underenhet {
  key: string;
  label: string;
}

export interface BygningsdelConfig {
  key: string;
  label: string;
  underenheter: Underenhet[];
}

export const BYGNINGSDELER: BygningsdelConfig[] = [
  {
    key: "grunn_og_fundamenter",
    label: "Grunn og fundamenter",
    underenheter: [
      { key: "fundamenter", label: "Fundamenter" },
      { key: "grunnmur", label: "Grunnmur" },
      { key: "fuktsikring_og_drenering", label: "Fuktsikring og drenering" },
      { key: "terrengforhold", label: "Terrengforhold" },
    ],
  },
  {
    key: "yttervegger_og_fasader",
    label: "Yttervegger og fasader",
    underenheter: [
      { key: "fasader_inkl_kledning", label: "Fasader inkl. kledning" },
      { key: "vindskier_og_vannbord", label: "Vindskier og vannbord" },
      { key: "balkonger_og_terrasser", label: "Balkonger og terrasser" },
    ],
  },
  {
    key: "vinduer_og_utvendige_dorer",
    label: "Vinduer og utvendige dører",
    underenheter: [
      { key: "vinduer", label: "Vinduer" },
      { key: "ytterdorer", label: "Ytterdører" },
      { key: "beslag_og_vannbord", label: "Beslag og vannbord" },
    ],
  },
  {
    key: "tak",
    label: "Tak",
    underenheter: [
      { key: "takkonstruksjon", label: "Takkonstruksjon" },
      { key: "taktekking", label: "Taktekking" },
      { key: "beslag", label: "Beslag" },
      { key: "renner_og_nedlop", label: "Renner og nedløp" },
    ],
  },
  {
    key: "rom_under_terreng",
    label: "Rom under terreng",
    underenheter: [
      { key: "vegger", label: "Vegger" },
      { key: "gulv", label: "Gulv" },
      { key: "dreneringsrelaterte_forhold", label: "Dreneringsrelaterte forhold" },
      { key: "fuktproblematikk", label: "Fuktproblematikk" },
    ],
  },
  {
    key: "vatrom",
    label: "Våtrom",
    underenheter: [
      { key: "overflater", label: "Overflater" },
      { key: "membran_tettesjikt", label: "Membran/tettesjikt" },
      { key: "sluk_og_fallforhold", label: "Sluk og fallforhold" },
      { key: "ventilasjon", label: "Ventilasjon" },
      { key: "vann_og_avlopsror", label: "Vann- og avløpsrør" },
    ],
  },
  {
    key: "kjokken",
    label: "Kjøkken",
    underenheter: [
      { key: "vanninstallasjoner", label: "Vanninstallasjoner" },
      { key: "avlop", label: "Avløp" },
      { key: "overflater_vannutsatte_soner", label: "Overflater ved vannutsatte soner" },
    ],
  },
  {
    key: "tekniske_installasjoner",
    label: "Tekniske installasjoner",
    underenheter: [
      { key: "innvendige_vannror", label: "Innvendige vannrør" },
      { key: "innvendige_avlopsror", label: "Innvendige avløpsrør" },
      { key: "varmtvannstank", label: "Varmtvannstank" },
      { key: "ventilasjon", label: "Ventilasjon" },
      { key: "elektrisk_anlegg", label: "Elektrisk anlegg" },
    ],
  },
  {
    key: "innvendige_forhold",
    label: "Innvendige forhold",
    underenheter: [
      { key: "overflater", label: "Overflater" },
      { key: "etasjeskiller", label: "Etasjeskiller" },
      { key: "innvendige_dorer", label: "Innvendige dører" },
      { key: "trapplosninger", label: "Trappløsninger" },
    ],
  },
];

/** Hent alle gyldige bygningsdel-keys */
export function gyldigeBygningsdeler(): string[] {
  return BYGNINGSDELER.map((b) => b.key);
}

/** Hent gyldige underenhet-keys for en gitt bygningsdel */
export function gyldigeUnderenheter(bygningsdelKey: string): string[] {
  const bd = BYGNINGSDELER.find((b) => b.key === bygningsdelKey);
  return bd ? bd.underenheter.map((u) => u.key) : [];
}
