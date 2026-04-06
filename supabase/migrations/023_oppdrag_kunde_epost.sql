-- Legger til kunde_epost-kolonne på oppdrag-tabellen
-- Brukes når oppdrag ikke er koblet til en megler- eller privatkundeprofil med e-post
ALTER TABLE oppdrag ADD COLUMN IF NOT EXISTS kunde_epost TEXT;
