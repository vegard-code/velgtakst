// ============================================================
// VelgTakst – Supabase Database Types
// ============================================================

export type Rolle = 'takstmann' | 'takstmann_admin' | 'megler' | 'privatkunde'

export type OppdragStatus =
  | 'ny'
  | 'akseptert'
  | 'under_befaring'
  | 'rapport_under_arbeid'
  | 'rapport_levert'
  | 'fakturert'
  | 'betalt'
  | 'kansellert'

export type OppdragType =
  | 'boligtaksering'
  | 'tilstandsrapport'
  | 'verditakst'
  | 'næringstaksering'
  | 'skadetaksering'
  | 'annet'

export type BestillingStatus = 'ny' | 'akseptert' | 'avvist' | 'kansellert' | 'fullfort'
export type PurreType = 'purring_1' | 'purring_2' | 'inkasso'
export type RegnskapSystem = 'fiken' | 'tripletex' | 'ingen'

// ============================================================
// Database row types
// ============================================================

export interface Company {
  id: string
  navn: string
  orgnr: string | null
  adresse: string | null
  postnr: string | null
  by: string | null
  telefon: string | null
  epost: string
  created_at: string
}

export interface UserProfile {
  id: string
  company_id: string | null
  rolle: Rolle
  navn: string
  telefon: string | null
  created_at: string
}

export interface TakstmannProfil {
  id: string
  user_id: string | null
  company_id: string | null
  navn: string
  tittel: string | null
  spesialitet: string | null
  bio: string | null
  telefon: string | null
  epost: string | null
  bilde_url: string | null
  sertifiseringer: string[]
  created_at: string
  updated_at: string
}

export interface FylkeSynlighet {
  id: string
  takstmann_id: string
  fylke_id: string
  er_aktiv: boolean
  betalt_til: string | null
  created_at: string
}

export interface MeglerProfil {
  id: string
  user_id: string | null
  company_id: string | null
  navn: string
  telefon: string | null
  epost: string | null
  meglerforetak: string | null
  created_at: string
}

export interface PrivatkundeProfil {
  id: string
  user_id: string | null
  navn: string
  telefon: string | null
  epost: string | null
  created_at: string
}

export interface Oppdrag {
  id: string
  company_id: string | null
  takstmann_id: string | null
  megler_id: string | null
  privatkunde_id: string | null
  tittel: string
  beskrivelse: string | null
  adresse: string | null
  postnr: string | null
  by: string | null
  oppdrag_type: OppdragType
  status: OppdragStatus
  frist: string | null
  befaringsdato: string | null
  pris: number | null
  faktura_id: string | null
  created_at: string
  updated_at: string
}

export interface Bestilling {
  id: string
  oppdrag_id: string | null
  takstmann_id: string | null
  bestilt_av_megler_id: string | null
  bestilt_av_kunde_id: string | null
  status: BestillingStatus
  melding: string | null
  created_at: string
  updated_at: string
}

export interface StatusLogg {
  id: string
  oppdrag_id: string
  fra_status: string | null
  til_status: string
  endret_av: string | null
  notat: string | null
  created_at: string
}

export interface Dokument {
  id: string
  oppdrag_id: string
  navn: string
  filtype: string | null
  storage_path: string
  lastet_opp_av: string | null
  er_rapport: boolean
  created_at: string
}

export interface PurreLogg {
  id: string
  oppdrag_id: string
  purre_type: PurreType
  sendt_til: string
  sendt_av: string | null
  status: string
  created_at: string
}

export interface MeglerVurdering {
  id: string
  takstmann_id: string
  megler_id: string | null
  oppdrag_id: string | null
  karakter: number | null
  kommentar: string | null
  created_at: string
}

export interface CompanySettings {
  id: string
  company_id: string
  regnskap_system: RegnskapSystem | null
  fiken_company_id: string | null
  fiken_api_token: string | null
  tripletex_employee_token: string | null
  tripletex_company_id: string | null
  purring_dager_1: number
  purring_dager_2: number
  inkasso_dager: number
  created_at: string
  updated_at: string
}

// ============================================================
// Supabase Database definition (for createClient<Database>)
// ============================================================

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at'>
        Update: Partial<Omit<Company, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>
      }
      takstmann_profiler: {
        Row: TakstmannProfil
        Insert: Omit<TakstmannProfil, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TakstmannProfil, 'id' | 'created_at' | 'updated_at'>>
      }
      fylke_synlighet: {
        Row: FylkeSynlighet
        Insert: Omit<FylkeSynlighet, 'id' | 'created_at'>
        Update: Partial<Omit<FylkeSynlighet, 'id' | 'created_at'>>
      }
      megler_profiler: {
        Row: MeglerProfil
        Insert: Omit<MeglerProfil, 'id' | 'created_at'>
        Update: Partial<Omit<MeglerProfil, 'id' | 'created_at'>>
      }
      privatkunde_profiler: {
        Row: PrivatkundeProfil
        Insert: Omit<PrivatkundeProfil, 'id' | 'created_at'>
        Update: Partial<Omit<PrivatkundeProfil, 'id' | 'created_at'>>
      }
      oppdrag: {
        Row: Oppdrag
        Insert: Omit<Oppdrag, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Oppdrag, 'id' | 'created_at' | 'updated_at'>>
      }
      bestillinger: {
        Row: Bestilling
        Insert: Omit<Bestilling, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Bestilling, 'id' | 'created_at' | 'updated_at'>>
      }
      status_logg: {
        Row: StatusLogg
        Insert: Omit<StatusLogg, 'id' | 'created_at'>
        Update: never
      }
      dokumenter: {
        Row: Dokument
        Insert: Omit<Dokument, 'id' | 'created_at'>
        Update: Partial<Omit<Dokument, 'id' | 'created_at'>>
      }
      purre_logg: {
        Row: PurreLogg
        Insert: Omit<PurreLogg, 'id' | 'created_at'>
        Update: never
      }
      megler_vurderinger: {
        Row: MeglerVurdering
        Insert: Omit<MeglerVurdering, 'id' | 'created_at'>
        Update: Partial<Omit<MeglerVurdering, 'id' | 'created_at'>>
      }
      company_settings: {
        Row: CompanySettings
        Insert: Omit<CompanySettings, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CompanySettings, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: Record<string, never>
    Functions: {
      auth_company_id: { Args: Record<string, never>; Returns: string }
      auth_user_rolle: { Args: Record<string, never>; Returns: string }
    }
    Enums: Record<string, never>
  }
}

// ============================================================
// Utvidede typer med joins
// ============================================================

export interface TakstmannMedFylker extends TakstmannProfil {
  fylke_synlighet: FylkeSynlighet[]
  snitt_karakter?: number
  antall_vurderinger?: number
}

export interface OppdragMedDetaljer extends Oppdrag {
  takstmann?: TakstmannProfil | null
  megler?: MeglerProfil | null
  privatkunde?: PrivatkundeProfil | null
  status_logg?: StatusLogg[]
  dokumenter?: Dokument[]
  purre_logg?: PurreLogg[]
}

export interface BestillingMedDetaljer extends Bestilling {
  takstmann?: TakstmannProfil | null
  megler?: MeglerProfil | null
  kunde?: PrivatkundeProfil | null
  oppdrag?: Oppdrag | null
}

// ============================================================
// Fylke-konstanter
// ============================================================

export interface Fylke {
  id: string
  navn: string
  er_stor: boolean  // stor fylke: 299 kr, standard: 199 kr
}

export const FYLKER: Fylke[] = [
  { id: 'oslo', navn: 'Oslo', er_stor: true },
  { id: 'rogaland', navn: 'Rogaland', er_stor: true },
  { id: 'vestland', navn: 'Vestland', er_stor: true },
  { id: 'trondelag', navn: 'Trøndelag', er_stor: true },
  { id: 'akershus', navn: 'Akershus', er_stor: true },
  { id: 'innlandet', navn: 'Innlandet', er_stor: false },
  { id: 'vestfold', navn: 'Vestfold', er_stor: false },
  { id: 'telemark', navn: 'Telemark', er_stor: false },
  { id: 'agder', navn: 'Agder', er_stor: false },
  { id: 'more-og-romsdal', navn: 'Møre og Romsdal', er_stor: false },
  { id: 'nordland', navn: 'Nordland', er_stor: false },
  { id: 'troms', navn: 'Troms', er_stor: false },
  { id: 'finnmark', navn: 'Finnmark', er_stor: false },
  { id: 'buskerud', navn: 'Buskerud', er_stor: false },
  { id: 'ostfold', navn: 'Østfold', er_stor: false },
]

export const FYLKE_PRIS = {
  standard: 199,
  stor: 299,
} as const

export function getFylkePris(fylkeId: string): number {
  const fylke = FYLKER.find(f => f.id === fylkeId)
  return fylke?.er_stor ? FYLKE_PRIS.stor : FYLKE_PRIS.standard
}

// ============================================================
// Status-labels (norsk bokmål)
// ============================================================

export const OPPDRAG_STATUS_LABELS: Record<OppdragStatus, string> = {
  ny: 'Ny',
  akseptert: 'Akseptert',
  under_befaring: 'Under befaring',
  rapport_under_arbeid: 'Rapport under arbeid',
  rapport_levert: 'Rapport levert',
  fakturert: 'Fakturert',
  betalt: 'Betalt',
  kansellert: 'Kansellert',
}

export const OPPDRAG_TYPE_LABELS: Record<OppdragType, string> = {
  boligtaksering: 'Boligtaksering',
  tilstandsrapport: 'Tilstandsrapport',
  verditakst: 'Verditakst',
  næringstaksering: 'Næringstaksering',
  skadetaksering: 'Skadetaksering',
  annet: 'Annet',
}

export const BESTILLING_STATUS_LABELS: Record<BestillingStatus, string> = {
  ny: 'Ny forespørsel',
  akseptert: 'Akseptert',
  avvist: 'Avvist',
  kansellert: 'Kansellert',
  fullfort: 'Fullført',
}
