-- ============================================================
-- VelgTakst – Storage Buckets
-- ============================================================

-- Bucket for dokumenter (rapporter, vedlegg)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dokumenter', 'dokumenter', false);

-- Bucket for profilbilder
INSERT INTO storage.buckets (id, name, public)
VALUES ('profilbilder', 'profilbilder', true);

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

-- Profilbilder – alle kan se
CREATE POLICY "Profilbilder er offentlige"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profilbilder');

-- Profilbilder – bruker kan laste opp sitt eget bilde
CREATE POLICY "Bruker kan laste opp eget profilbilde"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profilbilder'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "Bruker kan slette eget profilbilde"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profilbilder'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

-- Dokumenter – kun tilgang via RLS på oppdrag
CREATE POLICY "Takstmann kan laste opp dokumenter"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dokumenter'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Brukere kan lese sine dokumenter"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dokumenter'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Eier kan slette dokumenter"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dokumenter'
    AND auth.uid() = owner
  );
