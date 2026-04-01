-- Fix oppdrag_type CHECK constraint to match TypeScript types.
-- The original constraint included 'boligtaksering' but not
-- 'reklamasjonsrapport' or 'arealoppmaaling', which caused silent insert
-- failures for those types since they appear in the UI dropdown.

-- Migrate any existing rows using the removed type
UPDATE oppdrag SET oppdrag_type = 'annet' WHERE oppdrag_type = 'boligtaksering';

-- Replace the constraint
ALTER TABLE oppdrag DROP CONSTRAINT IF EXISTS oppdrag_oppdrag_type_check;
ALTER TABLE oppdrag ADD CONSTRAINT oppdrag_oppdrag_type_check
  CHECK (oppdrag_type IN (
    'tilstandsrapport',
    'verditakst',
    'næringstaksering',
    'skadetaksering',
    'reklamasjonsrapport',
    'arealoppmaaling',
    'annet'
  ));
