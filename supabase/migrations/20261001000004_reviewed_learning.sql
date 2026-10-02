CREATE TABLE public.learning_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  partition text NOT NULL CHECK(partition IN ('train','validation','test')),
  label text NOT NULL CHECK(length(label) BETWEEN 1 AND 100),
  event jsonb NOT NULL CHECK(octet_length(event::text)<=32768),
  event_hash text NOT NULL,
  provenance text NOT NULL CHECK(length(provenance) BETWEEN 20 AND 2000),
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(project_id,event_hash)
);
ALTER TABLE public.learning_examples ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_examples FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.learning_examples TO authenticated;
CREATE POLICY learning_example_read ON public.learning_examples FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.projects p JOIN public.organization_members m ON m.organization_id=p.organization_id
  WHERE p.id=learning_examples.project_id AND m.user_id=auth.uid() AND m.role IN ('owner','admin','developer')));

CREATE TABLE public.learning_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dataset_hash text NOT NULL,
  sample_ids uuid[] NOT NULL,
  weights jsonb NOT NULL CHECK(octet_length(weights::text)<=8388608),
  metrics jsonb NOT NULL,
  eligible boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id,dataset_hash)
);
CREATE TABLE public.learning_deployments (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  checkpoint_id uuid NOT NULL REFERENCES public.learning_checkpoints(id),
  previous_checkpoint_id uuid REFERENCES public.learning_checkpoints(id),
  promoted_by uuid NOT NULL REFERENCES auth.users(id),
  promoted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_deployments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_checkpoints,public.learning_deployments FROM PUBLIC,anon,authenticated;
