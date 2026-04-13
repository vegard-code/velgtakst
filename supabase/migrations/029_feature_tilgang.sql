-- Feature-tilgang per bruker.
-- Generisk tabell som støtter flere features (ARKAT nå, premium senere).
-- Designet for å enkelt kobles til abonnement/betaling senere.

CREATE TABLE feature_tilgang (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature     TEXT NOT NULL,
  aktiv       BOOLEAN NOT NULL DEFAULT true,
  gitt_av     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gitt_dato   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  utloper     TIMESTAMPTZ,  -- NULL = ingen utløpsdato (manuell tilgang)
  kilde       TEXT NOT NULL DEFAULT 'admin',  -- 'admin' | 'abonnement' | 'promo'
  merknad     TEXT,

  UNIQUE(user_id, feature)
);

-- Index for raske oppslag
CREATE INDEX idx_feature_tilgang_user ON feature_tilgang(user_id);
CREATE INDEX idx_feature_tilgang_feature ON feature_tilgang(feature, aktiv);

-- RLS
ALTER TABLE feature_tilgang ENABLE ROW LEVEL SECURITY;

-- Brukere kan se sine egne feature-tilganger
CREATE POLICY "Bruker ser egne tilganger"
  ON feature_tilgang FOR SELECT
  USING (auth.uid() = user_id);

-- Admin kan gjøre alt
CREATE POLICY "Admin full tilgang"
  ON feature_tilgang FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND rolle = 'admin'
    )
  );

-- Service role (brukt fra server) har full tilgang via service key
