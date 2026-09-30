BEGIN;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Only authorized backend paths may mutate connector state or access secrets.
REVOKE INSERT, UPDATE, DELETE ON public.connectors FROM anon, authenticated;
REVOKE ALL ON public.connector_credentials FROM anon, authenticated;
REVOKE ALL ON SCHEMA vault FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA vault FROM PUBLIC, anon, authenticated;
-- Supabase owns internal crypto functions; postgres cannot alter their ACLs.
-- Revoke the supported entry points and fail closed if any function still
-- grants execution to a browser role (including inherited/PUBLIC grants).
REVOKE ALL ON FUNCTION vault.create_secret(text,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION vault.update_secret(uuid,text,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN (VALUES ('anon'), ('authenticated')) AS browser(role_name)
    WHERE n.nspname='vault' AND has_function_privilege(browser.role_name,p.oid,'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'Vault function execution remains available to a browser role';
  END IF;
END;
$$;
COMMIT;
