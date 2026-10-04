CREATE TABLE public.external_training_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK(length(question) BETWEEN 10 AND 4000),
  answer text NOT NULL CHECK(length(answer) BETWEEN 10 AND 6000),
  question_hash text NOT NULL CHECK(length(question_hash)=64),
  evidence_group text NOT NULL CHECK(length(evidence_group) BETWEEN 3 AND 200),
  provenance text NOT NULL CHECK(length(provenance) BETWEEN 20 AND 2000),
  partition text NOT NULL CHECK(partition IN ('train','validation','test')),
  external_training_consent boolean NOT NULL CHECK(external_training_consent),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  review_note text CHECK(length(review_note)<=2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(reviewer_id IS NULL OR reviewer_id<>author_id),
  UNIQUE(project_id,question_hash)
);
CREATE INDEX external_training_scope ON public.external_training_examples(project_id,status,partition);
ALTER TABLE public.external_training_examples ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.external_training_examples FROM PUBLIC,anon,authenticated;
