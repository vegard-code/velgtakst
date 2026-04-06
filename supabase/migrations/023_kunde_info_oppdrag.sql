-- Legg til kundeinfo-felter på oppdrag-tabellen
ALTER TABLE oppdrag
  ADD COLUMN IF NOT EXISTS kunde_navn TEXT,
  ADD COLUMN IF NOT EXISTS kunde_epost TEXT;
