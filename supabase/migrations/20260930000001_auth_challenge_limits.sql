-- ADR-010: Backend-only OTP replay, guessing and resend protection.
CREATE TABLE public.auth_challenge_limits (
  subject_hash text NOT NULL CHECK (subject_hash ~ '^[a-f0-9]{64}$'),
  purpose text NOT NULL CHECK (purpose IN ('login','signup')),
  token_hash text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  consumed boolean NOT NULL DEFAULT false,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  sends integer NOT NULL DEFAULT 1 CHECK (sends BETWEEN 1 AND 5),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_hash, purpose)
);
ALTER TABLE public.auth_challenge_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_challenge_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_challenge_limits TO service_role;
