-- Utvid takstmann_profiler med andre spesialitet og tjenester-liste.
-- spesialitet (eksisterende) = primær spesialitet
-- spesialitet_2 = sekundær spesialitet (valgfri)
-- tjenester = andre oppdragstyper takstmannen utfører

ALTER TABLE takstmann_profiler
  ADD COLUMN IF NOT EXISTS spesialitet_2 text,
  ADD COLUMN IF NOT EXISTS tjenester text[] DEFAULT '{}';

COMMENT ON COLUMN takstmann_profiler.spesialitet_2 IS 'Sekundær spesialitet (valgfri)';
COMMENT ON COLUMN takstmann_profiler.tjenester IS 'Andre tjenester takstmannen tilbyr';
