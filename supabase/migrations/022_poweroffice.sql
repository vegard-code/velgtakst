-- Legg til PowerOffice GO-kolonner i company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS poweroffice_client_key TEXT,
  ADD COLUMN IF NOT EXISTS poweroffice_client_secret TEXT;

-- Oppdater CHECK-constraint til å inkludere 'poweroffice'
ALTER TABLE company_settings
  DROP CONSTRAINT IF EXISTS company_settings_regnskap_system_check;

ALTER TABLE company_settings
  ADD CONSTRAINT company_settings_regnskap_system_check
  CHECK (regnskap_system IN ('fiken', 'tripletex', 'poweroffice', 'ingen'));
