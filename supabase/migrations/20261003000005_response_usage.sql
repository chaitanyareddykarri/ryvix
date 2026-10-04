ALTER TABLE public.chat_turns ADD COLUMN response_usage jsonb
  CHECK(response_usage IS NULL OR (jsonb_typeof(response_usage)='object' AND octet_length(response_usage::text)<=4096));
ALTER TABLE public.whatsapp_assistant_messages ADD COLUMN response_usage jsonb
  CHECK(response_usage IS NULL OR (jsonb_typeof(response_usage)='object' AND octet_length(response_usage::text)<=4096));
COMMENT ON COLUMN public.chat_turns.response_usage IS 'Provider-reported successful response tokens; configured cost is an estimate, not invoice billing. Missing usage remains null.';
COMMENT ON COLUMN public.whatsapp_assistant_messages.response_usage IS 'Provider-reported successful response tokens and optional configured-rate estimate; excludes failed attempts.';
