-- ============================================================
-- 024: Fiks dokumenter RLS-policies (unngå auth_company_id() rekursjon)
-- ============================================================
-- Samme problem som ble fikset for oppdrag i 016:
-- auth_company_id() → user_profiles → user_profiles-policy →
-- auth_company_id() (rekursjon). Erstattes med direkte subquery
-- mot takstmann_profiler (har SELECT USING(true), ingen rekursjon).
-- ============================================================

-- INSERT: Takstmann kan laste opp dokumenter
DROP POLICY IF EXISTS "Takstmann kan laste opp dokumenter" ON dokumenter;

CREATE POLICY "Takstmann kan laste opp dokumenter"
  ON dokumenter FOR INSERT
  WITH CHECK (
    oppdrag_id IN (
      SELECT o.id FROM oppdrag o
      WHERE o.company_id IN (
        SELECT tp.company_id FROM takstmann_profiler tp
        WHERE tp.user_id = auth.uid()
      )
    )
  );

-- SELECT: Brukere ser dokumenter på sine oppdrag
-- Erstattes for å fjerne auth_company_id() i takstmann-grenen.
DROP POLICY IF EXISTS "Brukere ser dokumenter på sine oppdrag" ON dokumenter;

CREATE POLICY "Brukere ser dokumenter på sine oppdrag"
  ON dokumenter FOR SELECT
  USING (
    oppdrag_id IN (
      SELECT o.id FROM oppdrag o
      WHERE
        o.company_id IN (
          SELECT tp.company_id FROM takstmann_profiler tp
          WHERE tp.user_id = auth.uid()
        )
        OR o.megler_id IN (
          SELECT id FROM megler_profiler WHERE user_id = auth.uid()
        )
        OR o.privatkunde_id IN (
          SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid()
        )
    )
  );
