BEGIN;

-- RLS does not authorize TRUNCATE. Browser roles must not maintain application
-- tables, create triggers, or acquire table-reference privileges. Preserve all
-- existing row-level SELECT/INSERT/UPDATE/DELETE grants and policies here.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, anon, authenticated;

-- Supabase's privileged migration owner creates application tables. Remove
-- these default grants for subsequent tables created by that owner as well.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM PUBLIC, anon, authenticated;

COMMIT;
