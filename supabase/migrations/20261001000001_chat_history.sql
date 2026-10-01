BEGIN;
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id UUID,
  lease_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.chat_turns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (length(question)<=10000),
  answer TEXT NOT NULL CHECK (length(answer)<=64000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_turns_history ON public.chat_turns(conversation_id,id DESC);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_turns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_conversations,public.chat_turns FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.chat_conversations,public.chat_turns TO authenticated;
CREATE POLICY chat_owner_read ON public.chat_conversations FOR SELECT TO authenticated
USING (user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.organization_members m
  WHERE m.organization_id=chat_conversations.organization_id AND m.user_id=auth.uid()));
CREATE POLICY chat_turn_owner_read ON public.chat_turns FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id=chat_turns.conversation_id));
COMMIT;
