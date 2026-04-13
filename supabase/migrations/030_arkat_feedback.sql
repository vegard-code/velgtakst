-- Feedback fra takstmenn på ARKAT-generert tekst
CREATE TABLE IF NOT EXISTS arkat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Hva ble sendt inn
  bygningsdel text NOT NULL,
  underenhet text NOT NULL,
  tilstandsgrad text,  -- null for merknad-modus
  observasjon text NOT NULL,

  -- Hva kom ut
  resultat_arsak text,
  resultat_risiko text,
  resultat_konsekvens text,
  resultat_tiltak text,
  resultat_modus text,  -- 'standard' eller 'merknad'

  -- Feedback
  vurdering text NOT NULL CHECK (vurdering IN ('bra', 'justeringer', 'darlig')),
  kommentar text,  -- valgfri fritekst

  opprettet timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE arkat_feedback ENABLE ROW LEVEL SECURITY;

-- Takstmann kan sende inn sin egen feedback
CREATE POLICY "Bruker kan opprette egen feedback"
  ON arkat_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Bruker kan se sin egen feedback
CREATE POLICY "Bruker kan se egen feedback"
  ON arkat_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Admin kan se all feedback (via service client, men også via RLS for admin-rolle)
CREATE POLICY "Admin kan se all feedback"
  ON arkat_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND rolle = 'admin'
    )
  );

-- Index for admin-visning
CREATE INDEX idx_arkat_feedback_opprettet ON arkat_feedback(opprettet DESC);
CREATE INDEX idx_arkat_feedback_vurdering ON arkat_feedback(vurdering);
