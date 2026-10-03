CREATE TABLE public.whatsapp_phone_links (
  connector_id uuid NOT NULL REFERENCES public.channel_accounts(connector_id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL CHECK(phone ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(connector_id,user_id), UNIQUE(connector_id,phone)
);
CREATE TABLE public.whatsapp_phone_challenges (
  id uuid PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES public.channel_accounts(connector_id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL CHECK(phone ~ '^\+[1-9][0-9]{7,14}$'),
  code_digest text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  delivery text NOT NULL DEFAULT 'sending' CHECK(delivery IN ('sending','accepted','unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  UNIQUE(connector_id,user_id)
);
ALTER TABLE public.whatsapp_phone_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_phone_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_phone_links,public.whatsapp_phone_challenges FROM PUBLIC,anon,authenticated;
ALTER TABLE public.channel_inbox ADD COLUMN sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
