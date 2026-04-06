-- Legger til kunde_epost og kunde_navn på oppdrag-tabellen.
-- Brukes for oppdrag opprettet av takstmann for jobber mottatt utenfra
-- plattformen, der kunden ikke har en bruker-/profilkobling.
-- IF NOT EXISTS sikrer idempotens uavhengig av rekkefølge med andre PR-er.
ALTER TABLE oppdrag ADD COLUMN IF NOT EXISTS kunde_epost TEXT;
ALTER TABLE oppdrag ADD COLUMN IF NOT EXISTS kunde_navn TEXT;
