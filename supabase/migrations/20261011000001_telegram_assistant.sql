-- Add Telegram identity and linkage to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_username TEXT,
ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
