-- Admin hendelseslogg for å spore admin-handlinger
CREATE TABLE IF NOT EXISTS admin_hendelse_logg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  hendelse_type text NOT NULL,
  target_id uuid,
  target_type text,
  detaljer jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indeks for oppslag per target
CREATE INDEX IF NOT EXISTS idx_admin_hendelse_logg_target ON admin_hendelse_logg(target_id);
CREATE INDEX IF NOT EXISTS idx_admin_hendelse_logg_created ON admin_hendelse_logg(created_at DESC);

-- Kun service_role kan lese/skrive
ALTER TABLE admin_hendelse_logg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access" ON admin_hendelse_logg
  USING (true)
  WITH CHECK (true);
