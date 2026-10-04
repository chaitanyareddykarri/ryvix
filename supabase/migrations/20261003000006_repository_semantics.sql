ALTER TABLE public.repository_knowledge_files ADD COLUMN embedding_model text CHECK(length(embedding_model)<=200);
ALTER TABLE public.repository_knowledge_files ADD COLUMN embedding jsonb
  CHECK(embedding IS NULL OR (jsonb_typeof(embedding)='array' AND jsonb_array_length(embedding) BETWEEN 1 AND 4096 AND octet_length(embedding::text)<=200000));
COMMENT ON COLUMN public.repository_knowledge_files.embedding IS 'Normalized provider embedding of bounded sanitized file excerpt; same snapshot and access controls as source row.';
