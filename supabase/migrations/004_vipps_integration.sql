-- ============================================================
-- VelgTakst – Vipps-integrasjon (Login + Betaling)
-- ============================================================

-- Legg til Vipps-relaterte kolonner på oppdrag
ALTER TABLE oppdrag
  ADD COLUMN IF NOT EXISTS vipps_referanse TEXT,
  ADD COLUMN IF NOT EXISTS betalingsmetode TEXT DEFAULT 'faktura'
    CHECK (betalingsmetode IN ('faktura', 'vipps', 'manuell')),
  ADD COLUMN IF NOT EXISTS betalt_dato TIMESTAMPTZ;

-- Indeks for oppslag via Vipps-referanse (brukes av webhook)
CREATE INDEX IF NOT EXISTS idx_oppdrag_vipps_ref
  ON oppdrag (vipps_referanse)
  WHERE vipps_referanse IS NOT NULL;

-- Legg til Vipps-sub på user_profiles for kobling mellom Vipps og bruker
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS vipps_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_vipps_sub
  ON user_profiles (vipps_sub)
  WHERE vipps_sub IS NOT NULL;
