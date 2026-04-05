-- Legg til vipps_verifisert-kolonne på takstmann_profiler
-- Settes til true når en takstmann logger inn via Vipps (BankID-verifisert identitet)
ALTER TABLE takstmann_profiler
  ADD COLUMN IF NOT EXISTS vipps_verifisert boolean NOT NULL DEFAULT false;
