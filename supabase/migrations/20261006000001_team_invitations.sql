BEGIN;
CREATE TABLE public.organization_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 invited_by uuid NOT NULL REFERENCES auth.users(id),
 email text NOT NULL CHECK(email=lower(email) AND length(email)<=254),
 role text NOT NULL CHECK(role IN ('admin','developer','viewer')),
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.organization_invitations(organization_id,created_at DESC);
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_invitations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.organization_invitations TO service_role;
COMMIT;
