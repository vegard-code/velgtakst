-- Legg til adressefelter på privatkunde_profiler
ALTER TABLE privatkunde_profiler
  ADD COLUMN IF NOT EXISTS adresse text,
  ADD COLUMN IF NOT EXISTS postnr text,
  ADD COLUMN IF NOT EXISTS by text;
