-- ============================================================
-- VelgTakst – Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn        TEXT NOT NULL,
  orgnr       TEXT UNIQUE,
  adresse     TEXT,
  postnr      TEXT,
  by          TEXT,
  telefon     TEXT,
  epost       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES  (extends auth.users)
-- ============================================================
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  rolle       TEXT NOT NULL CHECK (rolle IN ('takstmann', 'takstmann_admin', 'megler', 'privatkunde')),
  navn        TEXT NOT NULL,
  telefon     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TAKSTMANN PROFILER
-- ============================================================
CREATE TABLE takstmann_profiler (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
  navn             TEXT NOT NULL,
  tittel           TEXT,
  spesialitet      TEXT,
  bio              TEXT,
  telefon          TEXT,
  epost            TEXT,
  bilde_url        TEXT,
  sertifiseringer  TEXT[] DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FYLKE SYNLIGHET  (betalingsbasert visning per fylke)
-- ============================================================
CREATE TABLE fylke_synlighet (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takstmann_id   UUID NOT NULL REFERENCES takstmann_profiler(id) ON DELETE CASCADE,
  fylke_id       TEXT NOT NULL,
  er_aktiv       BOOLEAN NOT NULL DEFAULT FALSE,
  betalt_til     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (takstmann_id, fylke_id)
);

-- ============================================================
-- MEGLER PROFILER
-- ============================================================
CREATE TABLE megler_profiler (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id     UUID REFERENCES companies(id) ON DELETE SET NULL,
  navn           TEXT NOT NULL,
  telefon        TEXT,
  epost          TEXT,
  meglerforetak  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRIVATKUNDE PROFILER
-- ============================================================
CREATE TABLE privatkunde_profiler (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  navn        TEXT NOT NULL,
  telefon     TEXT,
  epost       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- OPPDRAG
-- ============================================================
CREATE TABLE oppdrag (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  takstmann_id    UUID REFERENCES takstmann_profiler(id) ON DELETE SET NULL,
  megler_id       UUID REFERENCES megler_profiler(id) ON DELETE SET NULL,
  privatkunde_id  UUID REFERENCES privatkunde_profiler(id) ON DELETE SET NULL,
  tittel          TEXT NOT NULL,
  beskrivelse     TEXT,
  adresse         TEXT,
  postnr          TEXT,
  by              TEXT,
  oppdrag_type    TEXT NOT NULL CHECK (oppdrag_type IN (
    'boligtaksering','tilstandsrapport','verditakst',
    'næringstaksering','skadetaksering','annet'
  )),
  status          TEXT NOT NULL DEFAULT 'ny' CHECK (status IN (
    'ny','akseptert','under_befaring','rapport_under_arbeid',
    'rapport_levert','fakturert','betalt','kansellert'
  )),
  frist           TIMESTAMPTZ,
  befaringsdato   TIMESTAMPTZ,
  pris            DECIMAL(10,2),
  faktura_id      TEXT,          -- ekstern ID fra Fiken/Tripletex
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BESTILLINGER  (megler/kunde bestiller takstmann)
-- ============================================================
CREATE TABLE bestillinger (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oppdrag_id             UUID REFERENCES oppdrag(id) ON DELETE SET NULL,
  takstmann_id           UUID REFERENCES takstmann_profiler(id) ON DELETE SET NULL,
  bestilt_av_megler_id   UUID REFERENCES megler_profiler(id) ON DELETE SET NULL,
  bestilt_av_kunde_id    UUID REFERENCES privatkunde_profiler(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'ny' CHECK (status IN (
    'ny','akseptert','avvist','kansellert','fullfort'
  )),
  melding                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STATUS LOGG
-- ============================================================
CREATE TABLE status_logg (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oppdrag_id   UUID NOT NULL REFERENCES oppdrag(id) ON DELETE CASCADE,
  fra_status   TEXT,
  til_status   TEXT NOT NULL,
  endret_av    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notat        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOKUMENTER
-- ============================================================
CREATE TABLE dokumenter (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oppdrag_id      UUID NOT NULL REFERENCES oppdrag(id) ON DELETE CASCADE,
  navn            TEXT NOT NULL,
  filtype         TEXT,
  storage_path    TEXT NOT NULL,
  lastet_opp_av   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  er_rapport      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURRE LOGG
-- ============================================================
CREATE TABLE purre_logg (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oppdrag_id   UUID NOT NULL REFERENCES oppdrag(id) ON DELETE CASCADE,
  purre_type   TEXT NOT NULL CHECK (purre_type IN ('purring_1','purring_2','inkasso')),
  sendt_til    TEXT NOT NULL,
  sendt_av     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'sendt',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEGLER VURDERINGER
-- ============================================================
CREATE TABLE megler_vurderinger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takstmann_id  UUID NOT NULL REFERENCES takstmann_profiler(id) ON DELETE CASCADE,
  megler_id     UUID REFERENCES megler_profiler(id) ON DELETE SET NULL,
  oppdrag_id    UUID REFERENCES oppdrag(id) ON DELETE SET NULL,
  karakter      INTEGER CHECK (karakter BETWEEN 1 AND 5),
  kommentar     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMPANY SETTINGS  (regnskapssystem, purring-konfig)
-- ============================================================
CREATE TABLE company_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  regnskap_system           TEXT CHECK (regnskap_system IN ('fiken','tripletex','ingen')),
  fiken_company_id          TEXT,
  fiken_api_token           TEXT,
  tripletex_employee_token  TEXT,
  tripletex_company_id      TEXT,
  purring_dager_1           INTEGER NOT NULL DEFAULT 14,
  purring_dager_2           INTEGER NOT NULL DEFAULT 28,
  inkasso_dager             INTEGER NOT NULL DEFAULT 60,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_takstmann_profiler_updated_at
  BEFORE UPDATE ON takstmann_profiler
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_oppdrag_updated_at
  BEFORE UPDATE ON oppdrag
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bestillinger_updated_at
  BEFORE UPDATE ON bestillinger
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_takstmann_profiler_company ON takstmann_profiler(company_id);
CREATE INDEX idx_fylke_synlighet_fylke ON fylke_synlighet(fylke_id) WHERE er_aktiv = TRUE;
CREATE INDEX idx_oppdrag_company ON oppdrag(company_id);
CREATE INDEX idx_oppdrag_takstmann ON oppdrag(takstmann_id);
CREATE INDEX idx_oppdrag_status ON oppdrag(status);
CREATE INDEX idx_bestillinger_takstmann ON bestillinger(takstmann_id);
CREATE INDEX idx_status_logg_oppdrag ON status_logg(oppdrag_id);
CREATE INDEX idx_dokumenter_oppdrag ON dokumenter(oppdrag_id);
CREATE INDEX idx_megler_vurderinger_takstmann ON megler_vurderinger(takstmann_id);
