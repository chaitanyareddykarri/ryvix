CREATE TABLE public.whatsapp_assistant_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 connector_id uuid NOT NULL,user_id uuid NOT NULL,
 enabled boolean NOT NULL DEFAULT false,notifications boolean NOT NULL DEFAULT false,
 enabled_at timestamptz NOT NULL DEFAULT now(),last_inbound_at timestamptz,
 claim uuid,claim_until timestamptz,
 UNIQUE(connector_id,user_id),
 FOREIGN KEY(connector_id,user_id) REFERENCES public.whatsapp_phone_links(connector_id,user_id) ON DELETE CASCADE
);
CREATE TABLE public.whatsapp_assistant_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES public.whatsapp_assistant_sessions(id) ON DELETE CASCADE,
 inbox_id uuid NOT NULL UNIQUE REFERENCES public.channel_inbox(id) ON DELETE CASCADE,
 question text NOT NULL CHECK(length(question)<=10000),answer text CHECK(length(answer)<=3500),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done','cancelled','unknown')),
 provider text,model text,prompt_tokens integer,completion_tokens integer,latency_ms integer,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.whatsapp_assistant_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES public.whatsapp_assistant_sessions(id) ON DELETE CASCADE,
 message_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_assistant_messages(id) ON DELETE CASCADE,
 repository_id uuid NOT NULL REFERENCES public.repositories(id),prompt text NOT NULL CHECK(length(prompt) BETWEEN 1 AND 5000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected','expired')),
 task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes'
);
CREATE TABLE public.whatsapp_assistant_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES public.whatsapp_assistant_sessions(id) ON DELETE CASCADE,
 source_key text NOT NULL,body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3500),
 proactive boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','sent','delivered','read','failed','unknown','cancelled','window_closed')),
 provider_message_id text UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),claimed_at timestamptz,
 UNIQUE(session_id,source_key)
);
CREATE INDEX whatsapp_assistant_pending ON public.whatsapp_assistant_messages(status,created_at);
CREATE INDEX whatsapp_assistant_outgoing ON public.whatsapp_assistant_outbox(status,created_at);
ALTER TABLE public.whatsapp_assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_assistant_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_assistant_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_assistant_sessions,public.whatsapp_assistant_messages,public.whatsapp_assistant_proposals,public.whatsapp_assistant_outbox FROM PUBLIC,anon,authenticated;
