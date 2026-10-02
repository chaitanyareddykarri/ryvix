CREATE TABLE public.channel_accounts (
  connector_id uuid PRIMARY KEY REFERENCES public.connectors(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  provider_subject text NOT NULL UNIQUE,
  cursor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.channel_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES public.connectors(id) ON DELETE CASCADE,
  provider_message_id text NOT NULL,
  sender text NOT NULL,
  content text NOT NULL CHECK(length(content) BETWEEN 1 AND 10000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
  task_id uuid REFERENCES public.tasks(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connector_id,provider_message_id)
);
ALTER TABLE public.channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_inbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.channel_accounts,public.channel_inbox FROM PUBLIC,anon,authenticated;
CREATE INDEX ON public.channel_inbox(connector_id,created_at DESC);
