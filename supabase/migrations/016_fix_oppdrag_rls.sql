-- ============================================================
-- 016: Fiks oppdrag RLS-policies (unngå auth_company_id() rekursjon)
-- ============================================================
-- Erstatter policies som brukte auth_company_id() med direkte
-- subqueries mot takstmann_profiler for å unngå infinite recursion.
-- takstmann_profiler har SELECT USING(true), så ingen rekursjon.
--
-- VIKTIG: Kjør i Supabase SQL-editor. Sjekk at eksisterende policies
-- er droppet fra forrige feilsøking før du kjører dette.

-- ============================================================
-- OPPDRAG: Legg til manglende takstmann/bedrift-policy
-- ============================================================

-- Drop eksisterende policies som kan krasje (idempotent)
DROP POLICY IF EXISTS "Takstmann ser oppdrag i sin bedrift" ON oppdrag;
DROP POLICY IF EXISTS "Takstmann kan opprette oppdrag" ON oppdrag;
DROP POLICY IF EXISTS "Takstmann kan oppdatere oppdrag" ON oppdrag;
DROP POLICY IF EXISTS "Takstmann admin kan slette oppdrag" ON oppdrag;

-- SELECT: Takstmann ser oppdrag i sin bedrift
CREATE POLICY "Takstmann ser oppdrag i sin bedrift"
  ON oppdrag FOR SELECT
  USING (
    company_id IN (
      SELECT tp.company_id FROM takstmann_profiler tp
      WHERE tp.user_id = auth.uid()
    )
  );

-- INSERT: Takstmann kan opprette oppdrag i sin bedrift
CREATE POLICY "Takstmann kan opprette oppdrag"
  ON oppdrag FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT tp.company_id FROM takstmann_profiler tp
      WHERE tp.user_id = auth.uid()
    )
  );

-- UPDATE: Takstmann kan oppdatere oppdrag i sin bedrift
CREATE POLICY "Takstmann kan oppdatere oppdrag"
  ON oppdrag FOR UPDATE
  USING (
    company_id IN (
      SELECT tp.company_id FROM takstmann_profiler tp
      WHERE tp.user_id = auth.uid()
    )
  );

-- DELETE: Bare takstmann_admin kan slette (soft delete via status)
CREATE POLICY "Takstmann admin kan slette oppdrag"
  ON oppdrag FOR DELETE
  USING (
    company_id IN (
      SELECT tp.company_id FROM takstmann_profiler tp
      WHERE tp.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.rolle = 'takstmann_admin'
    )
  );

-- ============================================================
-- STATUS_LOGG: Fiks policy som kan referere oppdrag med recursion
-- ============================================================
DROP POLICY IF EXISTS "Brukere ser status_logg for sine oppdrag" ON status_logg;

CREATE POLICY "Brukere ser status_logg for sine oppdrag"
  ON status_logg FOR SELECT
  USING (
    endret_av = auth.uid()
    OR oppdrag_id IN (
      SELECT o.id FROM oppdrag o
      WHERE o.company_id IN (
        SELECT tp.company_id FROM takstmann_profiler tp
        WHERE tp.user_id = auth.uid()
      )
    )
  );
