-- Legg til kundeinformasjon direkte på oppdrag
-- Brukes når takstmenn registrerer oppdrag fra utenfor plattformen

ALTER TABLE oppdrag
  ADD COLUMN IF NOT EXISTS kunde_navn TEXT,
  ADD COLUMN IF NOT EXISTS kunde_epost TEXT;
