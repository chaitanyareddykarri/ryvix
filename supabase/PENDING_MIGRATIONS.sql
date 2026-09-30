-- Deprecated duplicate bundle. Authoritative SQL lives in supabase/migrations/.
-- Do not apply independent copies or bypass the migration history.
DO $$
BEGIN
  RAISE EXCEPTION 'Use the authoritative numbered migrations and verify the migration ledger; this duplicate bundle is disabled.';
END $$;
