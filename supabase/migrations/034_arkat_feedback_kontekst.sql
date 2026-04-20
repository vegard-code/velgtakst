-- Legger til akuttgrad, hovedgrunnlag og tilleggsgrunnlag i arkat_feedback
-- slik at admin-feedback-siden viser fullstendig kontekst for hva takstmannen valgte.
ALTER TABLE arkat_feedback
  ADD COLUMN IF NOT EXISTS akuttgrad text,
  ADD COLUMN IF NOT EXISTS hovedgrunnlag text,
  ADD COLUMN IF NOT EXISTS tilleggsgrunnlag text[],
  ADD COLUMN IF NOT EXISTS ns_versjon text;

COMMENT ON COLUMN arkat_feedback.akuttgrad IS 'Valgt akuttgrad: akutt, moderat, lav, kosmetisk, ingen_umiddelbar, positiv';
COMMENT ON COLUMN arkat_feedback.hovedgrunnlag IS 'Valgt observasjonstype/hovedgrunnlag: visuell_observasjon, maaling_indikasjon, alder_slitasje, dokumentasjon_mangler';
COMMENT ON COLUMN arkat_feedback.tilleggsgrunnlag IS 'Valgte tilleggsgrunnlag som array, f.eks. {undersoekelsesbegrensning,alder_som_grunnlag}';
COMMENT ON COLUMN arkat_feedback.ns_versjon IS 'Valgt NS-versjon: NS3600_2018 eller NS3600_2025';
