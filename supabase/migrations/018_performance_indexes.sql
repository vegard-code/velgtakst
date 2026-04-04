-- ============================================================
-- Ytelsesindekser – manglende kolonner brukt i WHERE/JOIN
-- ============================================================

-- bestillinger: filtrer på megler og kunde (hentMinebestillinger)
CREATE INDEX IF NOT EXISTS idx_bestillinger_megler
  ON bestillinger(bestilt_av_megler_id)
  WHERE bestilt_av_megler_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bestillinger_kunde
  ON bestillinger(bestilt_av_kunde_id)
  WHERE bestilt_av_kunde_id IS NOT NULL;

-- bestillinger: filtrer på status (badge-telling i layout, admin-visning)
CREATE INDEX IF NOT EXISTS idx_bestillinger_status
  ON bestillinger(status);

-- bestillinger: kombinert indeks for badge-telling per takstmann + status
CREATE INDEX IF NOT EXISTS idx_bestillinger_takstmann_status
  ON bestillinger(takstmann_id, status);

-- user_profiles: company_id brukes i alle portal-layouts og oppdrag-spørringer
CREATE INDEX IF NOT EXISTS idx_user_profiles_company
  ON user_profiles(company_id)
  WHERE company_id IS NOT NULL;

-- oppdrag: privatkunde_id brukes ved privatkunde-portal
CREATE INDEX IF NOT EXISTS idx_oppdrag_privatkunde
  ON oppdrag(privatkunde_id)
  WHERE privatkunde_id IS NOT NULL;

-- meldinger: avsender_id brukes i uleste-telling og markerSomLest
CREATE INDEX IF NOT EXISTS idx_meldinger_avsender
  ON meldinger(avsender_id);

-- samtaler: bestilling_id brukes i hentEllerOpprettSamtale
CREATE INDEX IF NOT EXISTS idx_samtaler_bestilling
  ON samtaler(bestilling_id)
  WHERE bestilling_id IS NOT NULL;

-- oppdrag: befaringsdato brukes i kalender-visning
CREATE INDEX IF NOT EXISTS idx_oppdrag_befaringsdato
  ON oppdrag(befaringsdato)
  WHERE befaringsdato IS NOT NULL;
