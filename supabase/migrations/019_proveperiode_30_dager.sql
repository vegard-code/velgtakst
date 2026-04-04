-- Endre standard prøveperiode fra 90 til 30 dager
ALTER TABLE abonnementer
  ALTER COLUMN proveperiode_slutt SET DEFAULT (now() + interval '30 days');
