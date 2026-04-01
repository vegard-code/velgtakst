-- ============================================================
-- Dokument kategorisering: dokument_type + storrelse
-- ============================================================

ALTER TABLE dokumenter
  ADD COLUMN IF NOT EXISTS dokument_type TEXT NOT NULL DEFAULT 'annet'
    CHECK (dokument_type IN ('tilstandsrapport', 'verditakst', 'skadetakst', 'foto', 'annet')),
  ADD COLUMN IF NOT EXISTS storrelse BIGINT;

-- Migrér eksisterende rapporter til dokument_type = 'tilstandsrapport'
UPDATE dokumenter
SET dokument_type = 'tilstandsrapport'
WHERE er_rapport = TRUE AND dokument_type = 'annet';
