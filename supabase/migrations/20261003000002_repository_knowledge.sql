CREATE TABLE public.repository_knowledge_settings (
  repository_id uuid PRIMARY KEY REFERENCES public.repositories(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  configured_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disabled' CHECK(status IN ('disabled','queued','indexing','ready','unavailable')),
  claim_id uuid,
  claim_expires_at timestamptz,
  last_attempt_at timestamptz,
  indexed_at timestamptz,
  commit_sha text CHECK(commit_sha ~ '^[a-f0-9]{40,64}$'),
  file_count integer NOT NULL DEFAULT 0,
  partial boolean NOT NULL DEFAULT true
);
CREATE TABLE public.repository_knowledge_files (
  repository_id uuid NOT NULL REFERENCES public.repository_knowledge_settings(repository_id) ON DELETE CASCADE,
  path text NOT NULL CHECK(length(path) BETWEEN 1 AND 512),
  content text NOT NULL CHECK(octet_length(content)<=32768),
  search_document tsvector GENERATED ALWAYS AS (to_tsvector('english',path||' '||content)) STORED,
  PRIMARY KEY(repository_id,path)
);
CREATE INDEX repository_knowledge_search ON public.repository_knowledge_files USING gin(search_document);
ALTER TABLE public.repository_knowledge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repository_knowledge_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.repository_knowledge_settings,public.repository_knowledge_files FROM PUBLIC,anon,authenticated;
