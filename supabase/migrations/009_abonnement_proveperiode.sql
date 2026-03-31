-- Abonnement og prøveperiode for takstmenn
-- Hver takstmann-bedrift (company) har et abonnement med prøveperiode

-- Abonnementstabell
CREATE TABLE IF NOT EXISTS abonnementer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'proveperiode'
    CHECK (status IN ('proveperiode', 'aktiv', 'kansellert', 'utlopt')),
  proveperiode_start timestamptz NOT NULL DEFAULT now(),
  proveperiode_slutt timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  vipps_agreement_id text,                 -- Vipps Recurring agreement ID
  vipps_agreement_status text,             -- ACTIVE, PENDING, STOPPED, EXPIRED
  maanedlig_belop integer DEFAULT 0,       -- beløp i øre
  neste_trekk_dato date,                   -- neste Vipps charge
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- RLS
ALTER TABLE abonnementer ENABLE ROW LEVEL SECURITY;

-- Takstmann kan lese sitt eget abonnement
CREATE POLICY "Takstmann leser eget abonnement"
  ON abonnementer FOR SELECT
  USING (company_id = auth_company_id());

-- Service-rolle kan gjøre alt
CREATE POLICY "Service full access abonnement"
  ON abonnementer FOR ALL
  USING (auth.role() = 'service_role');

-- Admin leser alle
CREATE POLICY "Admin leser abonnementer"
  ON abonnementer FOR SELECT
  USING (auth_user_rolle() = 'admin');
