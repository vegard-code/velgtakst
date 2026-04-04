-- Migration 017: Privatkunde bestillingsflyt
-- Legger til nye kolonner i bestillinger-tabellen for full tilbuds-/bekreftelsesflyt

ALTER TABLE bestillinger
  ADD COLUMN IF NOT EXISTS tilbudspris numeric(10,2),
  ADD COLUMN IF NOT EXISTS estimert_leveringstid text,
  ADD COLUMN IF NOT EXISTS tilbud_sendt_at timestamptz,
  ADD COLUMN IF NOT EXISTS befaringsdato date,
  ADD COLUMN IF NOT EXISTS noekkelinfo text,
  ADD COLUMN IF NOT EXISTS parkering text,
  ADD COLUMN IF NOT EXISTS tilgang text,
  ADD COLUMN IF NOT EXISTS sist_sett_kunde timestamptz,
  ADD COLUMN IF NOT EXISTS sist_sett_takstmann timestamptz;

-- Kommentar: Status-verdier som brukes i koden (ingen DB-constraint, kontrolleres i applikasjonslaget):
-- Megler-flyt (eksisterende): ny → akseptert / avvist / kansellert / fullfort
-- Privatkunde-flyt (ny):
--   forespørsel    = kunde sendt forespørsel, takstmann har ikke svart
--   tilbud_sendt   = takstmann sendt tilbud med pris og leveringstid
--   akseptert      = kunde aksepterte tilbudet, fylt inn praktisk info
--   avslått        = kunde avslo tilbudet
--   utløpt         = tilbud ikke besvart innen 48 timer
--   bekreftet      = takstmann bekreftet, oppdrag opprettet og synket til kalender
