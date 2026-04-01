-- Utvid oppdrag_type CHECK-constraint til å dekke alle tjenester fra ALLE_TJENESTER
-- Fjern gammel constraint og legg til ny med alle gyldige verdier

ALTER TABLE oppdrag DROP CONSTRAINT IF EXISTS oppdrag_oppdrag_type_check;

ALTER TABLE oppdrag
  ADD CONSTRAINT oppdrag_oppdrag_type_check
  CHECK (oppdrag_type IN (
    'tilstandsrapport',
    'reklamasjonsrapport',
    'verditakst',
    'skadetaksering',
    'næringstaksering',
    'arealoppmaaling',
    'tomtetakst',
    'byggesak',
    'naturskade',
    'forhåndstakst',
    'skjønnstakst',
    'brevtakst',
    'energirådgivning',
    'landbrukstakst',
    'våtromsinspeksjon',
    'annet',
    -- behold gammel verdi for bakoverkompatibilitet
    'boligtaksering'
  ));
