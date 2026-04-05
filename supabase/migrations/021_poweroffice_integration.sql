-- Legg til PowerOffice GO-felter i company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS poweroffice_client_key TEXT;

-- Oppdater regnskap_system-enum til å inkludere poweroffice
-- (Vi bruker TEXT-kolonne, så ingen enum-endring nødvendig – men oppdater constraint)
ALTER TABLE company_settings
  DROP CONSTRAINT IF EXISTS company_settings_regnskap_system_check;

ALTER TABLE company_settings
  ADD CONSTRAINT company_settings_regnskap_system_check
  CHECK (regnskap_system IN ('fiken', 'tripletex', 'poweroffice', 'ingen'));
