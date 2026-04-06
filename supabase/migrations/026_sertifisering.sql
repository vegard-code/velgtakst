-- 016_sertifisering.sql
-- Adds voluntary organization membership (forbundstilknytning) to takstmann profiles.
-- sertifisering: the organization name ('BMTF', 'Norsk Takst', 'Annet', or NULL)
-- sertifisering_annet: free-text specification when sertifisering = 'Annet'

ALTER TABLE takstmann_profiler
  ADD COLUMN IF NOT EXISTS sertifisering TEXT
    CHECK (sertifisering IN ('BMTF', 'Norsk Takst', 'Annet') OR sertifisering IS NULL),
  ADD COLUMN IF NOT EXISTS sertifisering_annet TEXT;

COMMENT ON COLUMN takstmann_profiler.sertifisering IS
  'Voluntary organization membership: BMTF, Norsk Takst, Annet, or NULL for none';
COMMENT ON COLUMN takstmann_profiler.sertifisering_annet IS
  'Free-text specification when sertifisering = ''Annet''';
