-- ============================================================
-- VelgTakst – ALLE MIGRASJONER (001–005) samlet
-- Kjør dette i Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 001: INITIAL SCHEMA
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- COMPANIES
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

-- USER PROFILES
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  rolle       TEXT NOT NULL CHECK (rolle IN ('takstmann', 'takstmann_admin', 'megler', 'privatkunde')),
  navn        TEXT NOT NULL,
  telefon     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TAKSTMANN PROFILER
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

-- FYLKE SYNLIGHET
CREATE TABLE fylke_synlighet (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takstmann_id   UUID NOT NULL REFERENCES takstmann_profiler(id) ON DELETE CASCADE,
  fylke_id       TEXT NOT NULL,
  er_aktiv       BOOLEAN NOT NULL DEFAULT FALSE,
  betalt_til     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (takstmann_id, fylke_id)
);

-- MEGLER PROFILER
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

-- PRIVATKUNDE PROFILER
CREATE TABLE privatkunde_profiler (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  navn        TEXT NOT NULL,
  telefon     TEXT,
  epost       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OPPDRAG
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
    'naeringstaksering','skadetaksering','annet'
  )),
  status          TEXT NOT NULL DEFAULT 'ny' CHECK (status IN (
    'ny','akseptert','under_befaring','rapport_under_arbeid',
    'rapport_levert','fakturert','betalt','kansellert'
  )),
  frist           TIMESTAMPTZ,
  befaringsdato   TIMESTAMPTZ,
  pris            DECIMAL(10,2),
  faktura_id      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BESTILLINGER
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

-- STATUS LOGG
CREATE TABLE status_logg (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oppdrag_id   UUID NOT NULL REFERENCES oppdrag(id) ON DELETE CASCADE,
  fra_status   TEXT,
  til_status   TEXT NOT NULL,
  endret_av    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notat        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DOKUMENTER
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

-- PURRE LOGG
CREATE TABLE purre_logg (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oppdrag_id   UUID NOT NULL REFERENCES oppdrag(id) ON DELETE CASCADE,
  purre_type   TEXT NOT NULL CHECK (purre_type IN ('purring_1','purring_2','inkasso')),
  sendt_til    TEXT NOT NULL,
  sendt_av     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'sendt',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MEGLER VURDERINGER
CREATE TABLE megler_vurderinger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takstmann_id  UUID NOT NULL REFERENCES takstmann_profiler(id) ON DELETE CASCADE,
  megler_id     UUID REFERENCES megler_profiler(id) ON DELETE SET NULL,
  oppdrag_id    UUID REFERENCES oppdrag(id) ON DELETE SET NULL,
  karakter      INTEGER CHECK (karakter BETWEEN 1 AND 5),
  kommentar     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMPANY SETTINGS
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

-- TRIGGERS
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

-- INDEXES
CREATE INDEX idx_takstmann_profiler_company ON takstmann_profiler(company_id);
CREATE INDEX idx_fylke_synlighet_fylke ON fylke_synlighet(fylke_id) WHERE er_aktiv = TRUE;
CREATE INDEX idx_oppdrag_company ON oppdrag(company_id);
CREATE INDEX idx_oppdrag_takstmann ON oppdrag(takstmann_id);
CREATE INDEX idx_oppdrag_status ON oppdrag(status);
CREATE INDEX idx_bestillinger_takstmann ON bestillinger(takstmann_id);
CREATE INDEX idx_status_logg_oppdrag ON status_logg(oppdrag_id);
CREATE INDEX idx_dokumenter_oppdrag ON dokumenter(oppdrag_id);
CREATE INDEX idx_megler_vurderinger_takstmann ON megler_vurderinger(takstmann_id);

-- ============================================================
-- 002: RLS POLICIES
-- ============================================================

ALTER TABLE companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE takstmann_profiler    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fylke_synlighet       ENABLE ROW LEVEL SECURITY;
ALTER TABLE megler_profiler       ENABLE ROW LEVEL SECURITY;
ALTER TABLE privatkunde_profiler  ENABLE ROW LEVEL SECURITY;
ALTER TABLE oppdrag               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestillinger          ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_logg           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumenter            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purre_logg            ENABLE ROW LEVEL SECURITY;
ALTER TABLE megler_vurderinger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings      ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_rolle()
RETURNS TEXT AS $$
  SELECT rolle FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_is_company_member(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND company_id = p_company_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Companies policies
CREATE POLICY "Brukere kan se sin egen bedrift"
  ON companies FOR SELECT
  USING (id = auth_company_id());

CREATE POLICY "Takstmann_admin kan oppdatere sin bedrift"
  ON companies FOR UPDATE
  USING (id = auth_company_id() AND auth_user_rolle() = 'takstmann_admin');

-- User profiles policies
CREATE POLICY "Bruker kan se sin egen profil"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Brukere i samme bedrift kan se hverandres profiler"
  ON user_profiles FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Bruker kan oppdatere sin egen profil"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Bruker kan opprette profil ved registrering"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Takstmann profiler policies
CREATE POLICY "Alle kan se takstmann-profiler"
  ON takstmann_profiler FOR SELECT
  USING (true);

CREATE POLICY "Takstmann kan oppdatere sin egen profil"
  ON takstmann_profiler FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Takstmann_admin kan oppdatere bedriftens profiler"
  ON takstmann_profiler FOR UPDATE
  USING (company_id = auth_company_id() AND auth_user_rolle() = 'takstmann_admin');

CREATE POLICY "Takstmann kan opprette profil"
  ON takstmann_profiler FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fylke synlighet policies
CREATE POLICY "Alle kan se aktive fylke-synligheter"
  ON fylke_synlighet FOR SELECT
  USING (er_aktiv = true);

CREATE POLICY "Takstmann kan se egne fylke-innstillinger"
  ON fylke_synlighet FOR SELECT
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Takstmann kan endre egne fylke-innstillinger"
  ON fylke_synlighet FOR ALL
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );

-- Megler profiler policies
CREATE POLICY "Takstmenn kan se megler-profiler"
  ON megler_profiler FOR SELECT
  USING (auth_user_rolle() IN ('takstmann', 'takstmann_admin'));

CREATE POLICY "Megler kan se og endre sin egen profil"
  ON megler_profiler FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Megler kan opprette profil"
  ON megler_profiler FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Privatkunde profiler policies
CREATE POLICY "Kunde kan se og endre sin egen profil"
  ON privatkunde_profiler FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Takstmenn kan se kundeinfo paa egne oppdrag"
  ON privatkunde_profiler FOR SELECT
  USING (
    id IN (
      SELECT privatkunde_id FROM oppdrag
      WHERE takstmann_id IN (
        SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
      )
    )
  );

-- Oppdrag policies
CREATE POLICY "Takstmann ser oppdrag i sin bedrift"
  ON oppdrag FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Megler ser sine egne bestilte oppdrag"
  ON oppdrag FOR SELECT
  USING (
    megler_id IN (
      SELECT id FROM megler_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Privatkunde ser sine egne oppdrag"
  ON oppdrag FOR SELECT
  USING (
    privatkunde_id IN (
      SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Takstmann kan opprette oppdrag"
  ON oppdrag FOR INSERT
  WITH CHECK (company_id = auth_company_id());

CREATE POLICY "Takstmann kan oppdatere oppdrag i sin bedrift"
  ON oppdrag FOR UPDATE
  USING (company_id = auth_company_id());

CREATE POLICY "Takstmann_admin kan slette oppdrag"
  ON oppdrag FOR DELETE
  USING (company_id = auth_company_id() AND auth_user_rolle() = 'takstmann_admin');

-- Bestillinger policies
CREATE POLICY "Takstmann ser innkommende bestillinger"
  ON bestillinger FOR SELECT
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE company_id = auth_company_id()
    )
  );

CREATE POLICY "Megler ser sine egne bestillinger"
  ON bestillinger FOR SELECT
  USING (
    bestilt_av_megler_id IN (
      SELECT id FROM megler_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Kunde ser sine egne bestillinger"
  ON bestillinger FOR SELECT
  USING (
    bestilt_av_kunde_id IN (
      SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Megler kan opprette bestilling"
  ON bestillinger FOR INSERT
  WITH CHECK (
    bestilt_av_megler_id IN (
      SELECT id FROM megler_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Kunde kan opprette bestilling"
  ON bestillinger FOR INSERT
  WITH CHECK (
    bestilt_av_kunde_id IN (
      SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Takstmann kan oppdatere bestillingsstatus"
  ON bestillinger FOR UPDATE
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE company_id = auth_company_id()
    )
  );

-- Status logg policies
CREATE POLICY "Brukere ser statuslogg for sine oppdrag"
  ON status_logg FOR SELECT
  USING (
    oppdrag_id IN (
      SELECT id FROM oppdrag
      WHERE
        company_id = auth_company_id()
        OR megler_id IN (SELECT id FROM megler_profiler WHERE user_id = auth.uid())
        OR privatkunde_id IN (SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Takstmann kan logge statusendringer"
  ON status_logg FOR INSERT
  WITH CHECK (
    oppdrag_id IN (
      SELECT id FROM oppdrag WHERE company_id = auth_company_id()
    )
  );

-- Dokumenter policies
CREATE POLICY "Brukere ser dokumenter paa sine oppdrag"
  ON dokumenter FOR SELECT
  USING (
    oppdrag_id IN (
      SELECT id FROM oppdrag
      WHERE
        company_id = auth_company_id()
        OR megler_id IN (SELECT id FROM megler_profiler WHERE user_id = auth.uid())
        OR privatkunde_id IN (SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Takstmann kan laste opp dokumenter"
  ON dokumenter FOR INSERT
  WITH CHECK (
    oppdrag_id IN (
      SELECT id FROM oppdrag WHERE company_id = auth_company_id()
    )
  );

CREATE POLICY "Takstmann kan slette egne dokumenter"
  ON dokumenter FOR DELETE
  USING (lastet_opp_av = auth.uid());

-- Purre logg policies
CREATE POLICY "Takstmann ser purrelogg for sine oppdrag"
  ON purre_logg FOR SELECT
  USING (
    oppdrag_id IN (
      SELECT id FROM oppdrag WHERE company_id = auth_company_id()
    )
  );

CREATE POLICY "Takstmann kan opprette purring"
  ON purre_logg FOR INSERT
  WITH CHECK (
    oppdrag_id IN (
      SELECT id FROM oppdrag WHERE company_id = auth_company_id()
    )
  );

-- Megler vurderinger policies
CREATE POLICY "Alle kan se vurderinger"
  ON megler_vurderinger FOR SELECT
  USING (true);

CREATE POLICY "Megler kan gi vurdering"
  ON megler_vurderinger FOR INSERT
  WITH CHECK (
    megler_id IN (
      SELECT id FROM megler_profiler WHERE user_id = auth.uid()
    )
  );

-- Company settings policies
CREATE POLICY "Brukere i bedriften kan se innstillinger"
  ON company_settings FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Takstmann_admin kan endre innstillinger"
  ON company_settings FOR ALL
  USING (
    company_id = auth_company_id()
    AND auth_user_rolle() = 'takstmann_admin'
  );

-- ============================================================
-- 003: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('dokumenter', 'dokumenter', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profilbilder', 'profilbilder', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Profilbilder er offentlige"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profilbilder');

CREATE POLICY "Bruker kan laste opp eget profilbilde"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profilbilder'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Bruker kan slette eget profilbilde"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profilbilder'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Takstmann kan laste opp dokumenter til storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dokumenter'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Brukere kan lese sine dokumenter fra storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dokumenter'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Eier kan slette dokumenter fra storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dokumenter'
    AND auth.uid() = owner
  );

-- ============================================================
-- 004: VIPPS INTEGRATION
-- ============================================================

ALTER TABLE oppdrag
  ADD COLUMN IF NOT EXISTS vipps_referanse TEXT,
  ADD COLUMN IF NOT EXISTS betalingsmetode TEXT DEFAULT 'faktura'
    CHECK (betalingsmetode IN ('faktura', 'vipps', 'manuell')),
  ADD COLUMN IF NOT EXISTS betalt_dato TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_oppdrag_vipps_ref
  ON oppdrag (vipps_referanse)
  WHERE vipps_referanse IS NOT NULL;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vipps_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_vipps_sub
  ON user_profiles (vipps_sub)
  WHERE vipps_sub IS NOT NULL;

-- ============================================================
-- 005: ADMIN ROLLE
-- ============================================================

ALTER TABLE user_profiles
  DROP CONSTRAINT user_profiles_rolle_check,
  ADD CONSTRAINT user_profiles_rolle_check
    CHECK (rolle IN ('admin', 'takstmann', 'takstmann_admin', 'megler', 'privatkunde'));
