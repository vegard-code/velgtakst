-- ============================================================
-- 028: Outlook Calendar integrasjon
-- ============================================================
-- Kjør denne i Supabase SQL-editor eller via supabase db push

-- Tabell for Outlook Calendar OAuth-tokens per takstmann
CREATE TABLE IF NOT EXISTS outlook_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  takstmann_id UUID NOT NULL REFERENCES takstmann_profiler(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (takstmann_id)
);

-- Legg til outlook_event_id på oppdrag-tabellen
ALTER TABLE oppdrag
  ADD COLUMN IF NOT EXISTS outlook_event_id TEXT;

-- RLS: Bare takstmannen selv kan lese/skrive sine tokens
ALTER TABLE outlook_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Takstmann kan lese egne outlook calendar tokens"
  ON outlook_calendar_tokens
  FOR SELECT
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Takstmann kan oppdatere egne outlook calendar tokens"
  ON outlook_calendar_tokens
  FOR ALL
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );

-- Service role trenger tilgang for å sette inn/oppdatere tokens via OAuth callback
-- (Dette håndteres via service client som bypasser RLS)

-- Trigger for updated_at på outlook_calendar_tokens
CREATE OR REPLACE FUNCTION update_outlook_calendar_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_outlook_calendar_tokens_updated_at
  BEFORE UPDATE ON outlook_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_outlook_calendar_tokens_updated_at();
