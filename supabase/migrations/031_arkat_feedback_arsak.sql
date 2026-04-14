-- Legger til arsak-kolonne i arkat_feedback for å skille Observasjon og Årsak.
-- Etter omleggingen i april 2026 skriver takstmannen nå Observasjon (fakta)
-- og Årsak (faglig vurdering) i separate felter. Vi lagrer begge for analyse.
--
-- Eksisterende rader har observasjon-kolonnen fylt med det som tidligere var
-- "årsak-feltet" (én-felts-modellen). Det er beholdt uendret for bakoverkompatibilitet.

ALTER TABLE arkat_feedback
  ADD COLUMN IF NOT EXISTS arsak TEXT;

COMMENT ON COLUMN arkat_feedback.observasjon IS 'Fakta: hva takstmannen så, målte, eller ikke kunne undersøke.';
COMMENT ON COLUMN arkat_feedback.arsak IS 'Faglig vurdering: hvorfor forholdet er et avvik. NULL i merknad-modus og for rader lagret før splittingen i april 2026.';
