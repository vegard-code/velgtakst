-- Legg til 'admin' som gyldig rolle i user_profiles
ALTER TABLE user_profiles
  DROP CONSTRAINT user_profiles_rolle_check,
  ADD CONSTRAINT user_profiles_rolle_check
    CHECK (rolle IN ('admin', 'takstmann', 'takstmann_admin', 'megler', 'privatkunde'));
