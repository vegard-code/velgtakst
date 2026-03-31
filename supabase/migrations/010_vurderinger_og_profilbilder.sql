-- 010: Utvid vurderinger til å støtte kunder + opprett profilbilder-bucket
-- =====================================================================

-- Legg til kunde_id kolonne i megler_vurderinger
-- (slik at både meglere OG privatkunder kan gi vurderinger)
ALTER TABLE megler_vurderinger
  ADD COLUMN IF NOT EXISTS kunde_id uuid REFERENCES privatkunde_profiler(id);

-- Gjør megler_id optional (allerede nullable, men vær sikker)
ALTER TABLE megler_vurderinger
  ALTER COLUMN megler_id DROP NOT NULL;

-- Legg til constraint: minst én av megler_id eller kunde_id må være satt
-- (Dropp først om den allerede finnes)
DO $$ BEGIN
  ALTER TABLE megler_vurderinger
    ADD CONSTRAINT vurdering_har_avsender
    CHECK (megler_id IS NOT NULL OR kunde_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS policy for at kunder kan opprette vurderinger
DO $$ BEGIN
  CREATE POLICY "Kunder kan opprette vurderinger"
    ON megler_vurderinger
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS policy for at alle kan lese vurderinger
DO $$ BEGIN
  CREATE POLICY "Alle kan lese vurderinger"
    ON megler_vurderinger
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Opprett storage bucket for profilbilder
INSERT INTO storage.buckets (id, name, public)
VALUES ('profilbilder', 'profilbilder', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users kan laste opp
DO $$ BEGIN
  CREATE POLICY "Authenticated kan laste opp profilbilder"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'profilbilder');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage policy: alle kan lese profilbilder (public bucket)
DO $$ BEGIN
  CREATE POLICY "Alle kan se profilbilder"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'profilbilder');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage policy: authenticated kan oppdatere egne bilder
DO $$ BEGIN
  CREATE POLICY "Authenticated kan oppdatere profilbilder"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'profilbilder');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage policy: authenticated kan slette egne bilder
DO $$ BEGIN
  CREATE POLICY "Authenticated kan slette profilbilder"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'profilbilder');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
