-- Kommune-synlighet: takstmenn velger hvilke kommuner de vil vises i
-- Når et fylke aktiveres, settes alle kommuner i fylket automatisk til aktive
-- Takstmannen kan deretter skru av enkelt-kommuner

CREATE TABLE IF NOT EXISTS kommune_synlighet (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  takstmann_id UUID NOT NULL REFERENCES takstmann_profiler(id) ON DELETE CASCADE,
  fylke_id TEXT NOT NULL,
  kommune_id TEXT NOT NULL,
  er_aktiv BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(takstmann_id, kommune_id)
);

CREATE INDEX idx_kommune_synlighet_aktiv ON kommune_synlighet(kommune_id) WHERE er_aktiv = true;
CREATE INDEX idx_kommune_synlighet_takstmann ON kommune_synlighet(takstmann_id);

-- RLS
ALTER TABLE kommune_synlighet ENABLE ROW LEVEL SECURITY;

-- Alle kan se aktive kommune-synligheter (for offentlige kommune-sider)
CREATE POLICY "Offentlig lesing av aktive kommuner"
  ON kommune_synlighet FOR SELECT
  USING (er_aktiv = true);

-- Takstmenn kan se alle sine egne (inkl. deaktiverte)
CREATE POLICY "Takstmenn ser egne kommuner"
  ON kommune_synlighet FOR SELECT
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );

-- Takstmenn kan opprette og oppdatere egne
CREATE POLICY "Takstmenn oppretter egne kommuner"
  ON kommune_synlighet FOR INSERT
  WITH CHECK (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Takstmenn oppdaterer egne kommuner"
  ON kommune_synlighet FOR UPDATE
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Takstmenn sletter egne kommuner"
  ON kommune_synlighet FOR DELETE
  USING (
    takstmann_id IN (
      SELECT id FROM takstmann_profiler WHERE user_id = auth.uid()
    )
  );
