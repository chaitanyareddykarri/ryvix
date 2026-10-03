CREATE TABLE public.experience_settings (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  retention_days integer NOT NULL DEFAULT 30 CHECK(retention_days BETWEEN 7 AND 90)
);
CREATE TABLE public.experience_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('coding','deployment','security','metrics','service','recovery','chat')),
  source_key text NOT NULL CHECK(length(source_key)<=300),
  evidence jsonb NOT NULL CHECK(octet_length(evidence::text)<=16384),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,kind,source_key)
);
CREATE INDEX experience_recent ON public.experience_events(project_id,observed_at DESC);
CREATE INDEX experience_expiry ON public.experience_events(expires_at);
CREATE TABLE public.experience_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.experience_events(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK(length(content) BETWEEN 20 AND 2000),
  review_note text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(reviewer_id IS NULL OR reviewer_id<>author_id)
);
CREATE INDEX experience_lesson_project ON public.experience_lessons(project_id,status);
CREATE TABLE public.personal_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('preference','goal','constraint','correction')),
  content text NOT NULL CHECK(length(content) BETWEEN 3 AND 1000),
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX personal_memory_owner ON public.personal_memories(organization_id,user_id);
-- All access goes through backend authorization; no browser table permissions.
ALTER TABLE public.experience_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_memories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.experience_settings,public.experience_events,public.experience_lessons,public.personal_memories FROM PUBLIC,anon,authenticated;

CREATE TABLE public.experience_predictions (
  event_id uuid NOT NULL REFERENCES public.experience_events(id) ON DELETE CASCADE,
  checkpoint_id uuid NOT NULL REFERENCES public.learning_checkpoints(id) ON DELETE CASCADE,
  predicted_class text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,checkpoint_id)
);
ALTER TABLE public.experience_predictions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.experience_predictions FROM PUBLIC,anon,authenticated;

ALTER TABLE public.chat_turns ADD COLUMN response_latency_ms integer CHECK(response_latency_ms BETWEEN 0 AND 300000);
ALTER TABLE public.chat_turns ADD COLUMN response_provider text CHECK(length(response_provider)<=100);
ALTER TABLE public.chat_turns ADD COLUMN response_model text CHECK(length(response_model)<=200);
