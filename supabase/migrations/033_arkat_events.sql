-- Hendelseslogg for ARKAT Skrivehjelp — bruksstatistikk per bruker
-- PERSONVERN: Lagrer kun lengder og strukturerte felt — IKKE råtekst fra observasjon eller generert tekst.
-- Råtekst-logging kan aktiveres per bruker (opt-in) i en fremtidig migrering ved å legge til text-kolonner.
CREATE TABLE IF NOT EXISTS arkat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('generated', 'copied_field', 'copied_all', 'reset')),
  created_at timestamp with time zone DEFAULT now(),

  -- Metadata for 'generated'
  bygningsdel text,
  underenhet text,
  tilstandsgrad text,
  hovedgrunnlag text,       -- tilsvarer "observasjonstype" i spec
  akuttgrad text,
  observasjon_lengde int,   -- antall tegn — IKKE råteksten
  screening_approved boolean,
  screening_reason text,

  -- Metadata for 'copied_field'
  copied_field text CHECK (copied_field IN ('arsak', 'risiko', 'konsekvens', 'anbefalt_tiltak'))
);

ALTER TABLE arkat_events ENABLE ROW LEVEL SECURITY;

-- Takstmenn kan logge sine egne hendelser
CREATE POLICY "Bruker kan logge egne arkat-hendelser"
  ON arkat_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kun admin-rolle kan lese statistikken
CREATE POLICY "Admin kan lese alle arkat-hendelser"
  ON arkat_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND rolle = 'admin'
    )
  );

-- Indekser for admin-spørringer
CREATE INDEX idx_arkat_events_user_id ON arkat_events(user_id);
CREATE INDEX idx_arkat_events_created_at ON arkat_events(created_at DESC);
CREATE INDEX idx_arkat_events_event_type ON arkat_events(event_type);
