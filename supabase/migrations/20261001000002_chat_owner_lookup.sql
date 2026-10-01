BEGIN;
-- ADR-019: bound per-owner lease and creation-budget queries as history grows.
CREATE INDEX chat_conversations_owner_lookup
  ON public.chat_conversations(organization_id,user_id,created_at DESC)
  INCLUDE (lease_expires_at);
COMMIT;
