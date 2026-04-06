-- Legg til kundeinfo-kolonner på oppdrag-tabellen
ALTER TABLE oppdrag
  ADD COLUMN IF NOT EXISTS kunde_navn TEXT,
  ADD COLUMN IF NOT EXISTS kunde_epost TEXT;
