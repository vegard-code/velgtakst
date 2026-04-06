-- ============================================================
-- Onboarding-status for bedrifter opprettet via Vipps
-- ============================================================
-- Nye companies får onboarding_fullfort = FALSE (default).
-- Eksisterende companies settes til TRUE (allerede i bruk).
-- Manuell registrering setter onboarding_fullfort = TRUE eksplisitt.

ALTER TABLE companies
  ADD COLUMN onboarding_fullfort BOOLEAN NOT NULL DEFAULT FALSE;

-- Alle eksisterende bedrifter har allerede fullført onboarding
UPDATE companies SET onboarding_fullfort = TRUE;
