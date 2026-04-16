-- Ytelsesindekser basert på codebase-gjennomgang 2026-04-16
-- Dekker cron-jobs, admin-sider og offentlige sider

-- Meldinger: brukes av meldinger-varsel-cron for å finne uleste meldinger
CREATE INDEX IF NOT EXISTS idx_meldinger_lest_created
  ON meldinger (lest, created_at)
  WHERE lest = false;

-- Vurderinger: brukes av kommune-sider for å hente karakter per takstmann
CREATE INDEX IF NOT EXISTS idx_megler_vurderinger_takstmann
  ON megler_vurderinger (takstmann_id);

-- Purre-logg: brukes av purring-cron for å sjekke eksisterende purringer
CREATE INDEX IF NOT EXISTS idx_purre_logg_oppdrag
  ON purre_logg (oppdrag_id);

-- Oppdrag status: brukes av purring-cron for å filtrere fakturerte oppdrag
CREATE INDEX IF NOT EXISTS idx_oppdrag_status
  ON oppdrag (status);

-- Bestillinger: brukes av tilbud-utlopt-cron
CREATE INDEX IF NOT EXISTS idx_bestillinger_status_tilbud
  ON bestillinger (status, tilbud_sendt_at)
  WHERE status = 'tilbud_sendt';
