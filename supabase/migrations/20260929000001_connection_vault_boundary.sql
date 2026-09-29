BEGIN;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Only authorized backend paths may mutate connector state or access secrets.
REVOKE INSERT, UPDATE, DELETE ON public.connectors FROM anon, authenticated;
REVOKE ALL ON public.connector_credentials FROM anon, authenticated;
REVOKE ALL ON SCHEMA vault FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA vault FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA vault FROM PUBLIC, anon, authenticated;
COMMIT;
