-- ============================================================
-- Meldinger (messaging between kunde/megler and takstmann)
-- ============================================================

-- Samtaler (conversations) – knyttet til en bestilling
CREATE TABLE IF NOT EXISTS samtaler (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bestilling_id uuid REFERENCES bestillinger(id) ON DELETE CASCADE,
  takstmann_id uuid NOT NULL REFERENCES takstmann_profiler(id) ON DELETE CASCADE,
  kunde_id uuid REFERENCES privatkunde_profiler(id) ON DELETE SET NULL,
  megler_id uuid REFERENCES megler_profiler(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT samtale_har_motpart CHECK (kunde_id IS NOT NULL OR megler_id IS NOT NULL)
);

-- Meldinger
CREATE TABLE IF NOT EXISTS meldinger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  samtale_id uuid NOT NULL REFERENCES samtaler(id) ON DELETE CASCADE,
  avsender_id uuid NOT NULL,  -- auth.uid()
  innhold text NOT NULL,
  lest boolean NOT NULL DEFAULT false,
  lest_tidspunkt timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Varsel-innstillinger per bruker
CREATE TABLE IF NOT EXISTS varsel_innstillinger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  epost_meldinger boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- For rask henting av uleste + epost-varsling
CREATE INDEX IF NOT EXISTS idx_meldinger_samtale ON meldinger(samtale_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meldinger_uleste ON meldinger(samtale_id, lest) WHERE lest = false;
CREATE INDEX IF NOT EXISTS idx_samtaler_takstmann ON samtaler(takstmann_id);
CREATE INDEX IF NOT EXISTS idx_samtaler_kunde ON samtaler(kunde_id);
CREATE INDEX IF NOT EXISTS idx_samtaler_megler ON samtaler(megler_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE samtaler ENABLE ROW LEVEL SECURITY;
ALTER TABLE meldinger ENABLE ROW LEVEL SECURITY;
ALTER TABLE varsel_innstillinger ENABLE ROW LEVEL SECURITY;

-- Samtaler: participants can see their own conversations
CREATE POLICY samtaler_select ON samtaler FOR SELECT TO authenticated USING (
  takstmann_id IN (SELECT id FROM takstmann_profiler WHERE user_id = auth.uid())
  OR kunde_id IN (SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid())
  OR megler_id IN (SELECT id FROM megler_profiler WHERE user_id = auth.uid())
);

CREATE POLICY samtaler_insert ON samtaler FOR INSERT TO authenticated WITH CHECK (true);

-- Meldinger: participants of the samtale can read/write
CREATE POLICY meldinger_select ON meldinger FOR SELECT TO authenticated USING (
  samtale_id IN (
    SELECT id FROM samtaler WHERE
      takstmann_id IN (SELECT id FROM takstmann_profiler WHERE user_id = auth.uid())
      OR kunde_id IN (SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid())
      OR megler_id IN (SELECT id FROM megler_profiler WHERE user_id = auth.uid())
  )
);

CREATE POLICY meldinger_insert ON meldinger FOR INSERT TO authenticated WITH CHECK (
  avsender_id = auth.uid()
  AND samtale_id IN (
    SELECT id FROM samtaler WHERE
      takstmann_id IN (SELECT id FROM takstmann_profiler WHERE user_id = auth.uid())
      OR kunde_id IN (SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid())
      OR megler_id IN (SELECT id FROM megler_profiler WHERE user_id = auth.uid())
  )
);

CREATE POLICY meldinger_update ON meldinger FOR UPDATE TO authenticated USING (
  samtale_id IN (
    SELECT id FROM samtaler WHERE
      takstmann_id IN (SELECT id FROM takstmann_profiler WHERE user_id = auth.uid())
      OR kunde_id IN (SELECT id FROM privatkunde_profiler WHERE user_id = auth.uid())
      OR megler_id IN (SELECT id FROM megler_profiler WHERE user_id = auth.uid())
  )
);

-- Varsel-innstillinger: own only
CREATE POLICY varsel_innstillinger_select ON varsel_innstillinger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY varsel_innstillinger_insert ON varsel_innstillinger FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY varsel_innstillinger_update ON varsel_innstillinger FOR UPDATE TO authenticated USING (user_id = auth.uid());
