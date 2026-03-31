-- Legg til oppdrag_type og adresse på bestillinger-tabellen
-- slik at kunder kan velge tjenestetype direkte ved bestilling.

ALTER TABLE bestillinger
  ADD COLUMN IF NOT EXISTS oppdrag_type text,
  ADD COLUMN IF NOT EXISTS adresse text;

COMMENT ON COLUMN bestillinger.oppdrag_type IS 'Type tjeneste kunden har valgt (verditakst, tilstandsrapport, etc.)';
COMMENT ON COLUMN bestillinger.adresse IS 'Adresse for befaring';
