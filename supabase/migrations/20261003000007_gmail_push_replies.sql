ALTER TABLE public.channel_accounts ADD COLUMN gmail_send_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.channel_accounts ADD COLUMN gmail_watch_expires_at timestamptz;
CREATE TABLE public.gmail_push_events (
  provider_message_id text PRIMARY KEY CHECK(length(provider_message_id) BETWEEN 1 AND 200),
  connector_id uuid NOT NULL REFERENCES public.channel_accounts(connector_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz
);
CREATE INDEX gmail_push_pending ON public.gmail_push_events(connector_id,created_at) WHERE processed_at IS NULL;
CREATE TABLE public.gmail_reply_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES public.channel_accounts(connector_id) ON DELETE CASCADE,
  inbox_id uuid NOT NULL REFERENCES public.channel_inbox(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient text NOT NULL CHECK(length(recipient)<=320),
  subject text NOT NULL CHECK(length(subject)<=500),
  thread_id text NOT NULL CHECK(length(thread_id)<=200),
  reply_to_message_id text NOT NULL CHECK(length(reply_to_message_id)<=500),
  body text NOT NULL CHECK(length(body) BETWEEN 1 AND 6000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','unknown','rejected','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',
  provider_message_id text
);
ALTER TABLE public.gmail_push_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_reply_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gmail_push_events,public.gmail_reply_drafts FROM PUBLIC,anon,authenticated;
