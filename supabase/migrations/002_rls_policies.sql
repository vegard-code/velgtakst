-- ============================================================
-- VelgTakst – Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
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

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's company_id
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION auth_user_rolle()
RETURNS TEXT AS $$
  SELECT rolle FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user belongs to a company
CREATE OR REPLACE FUNCTION auth_is_company_member(p_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND company_id = p_company_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE POLICY "Brukere kan se sin egen bedrift"
  ON companies FOR SELECT
  USING (id = auth_company_id());

CREATE POLICY "Takstmann_admin kan oppdatere sin bedrift"
  ON companies FOR UPDATE
  USING (id = auth_company_id() AND auth_user_rolle() = 'takstmann_admin');

-- ============================================================
-- USER PROFILES
-- ============================================================
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

-- ============================================================
-- TAKSTMANN PROFILER – offentlige profiler vises for alle
-- ============================================================
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

-- ============================================================
-- FYLKE SYNLIGHET
-- ============================================================
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

-- ============================================================
-- MEGLER PROFILER
-- ============================================================
CREATE POLICY "Takstmenn kan se megler-profiler"
  ON megler_profiler FOR SELECT
  USING (auth_user_rolle() IN ('takstmann', 'takstmann_admin'));

CREATE POLICY "Megler kan se og endre sin egen profil"
  ON megler_profiler FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Megler kan opprette profil"
  ON megler_profiler FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PRIVATKUNDE PROFILER
-- ============================================================
CREATE POLICY "Kunde kan se og endre sin egen profil"
  ON privatkunde_profiler FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Takstmenn kan se kundeinfo på egne oppdrag"
  ON privatkunde_profiler FOR SELECT
  USING (
    id IN (
      SELECT privatkunde_id FROM oppdrag
      WHERE takstmann_id IN (
        SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- OPPDRAG
-- ============================================================
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

-- ============================================================
-- BESTILLINGER
-- ============================================================
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

-- ============================================================
-- STATUS LOGG
-- ============================================================
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

-- ============================================================
-- DOKUMENTER
-- ============================================================
CREATE POLICY "Brukere ser dokumenter på sine oppdrag"
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

-- ============================================================
-- PURRE LOGG
-- ============================================================
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

-- ============================================================
-- MEGLER VURDERINGER
-- ============================================================
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

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
CREATE POLICY "Brukere i bedriften kan se innstillinger"
  ON company_settings FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Takstmann_admin kan endre innstillinger"
  ON company_settings FOR ALL
  USING (
    company_id = auth_company_id()
    AND auth_user_rolle() = 'takstmann_admin'
  );
