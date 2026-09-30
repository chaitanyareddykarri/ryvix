import 'server-only';
import { createHash } from 'node:crypto';
import { challengeMetadata } from './auth-security';
import { queryDirectDb } from './direct-db';

type Purpose = 'login' | 'signup';

/** Reserve before sending mail. Failed delivery never reactivates the old token. */
export async function registerAuthChallenge(token: string, email: string, purpose: Purpose, previous?: string): Promise<boolean> {
  const meta = challengeMetadata(token, email, purpose);
  if (!meta) return false;
  const previousHash = previous ? createHash('sha256').update(previous).digest('hex') : null;
  const rows = previousHash
    ? await queryDirectDb(`UPDATE auth_challenge_limits SET token_hash=$3, sent_at=now(), sends=sends+1
        WHERE subject_hash=$1 AND purpose=$2 AND token_hash=$4 AND NOT consumed
        AND expires_at>now() AND attempts<5 AND sends<5 AND sent_at<=now()-interval '1 minute'
        RETURNING subject_hash`,
      [meta.subjectHash, purpose, meta.tokenHash, previousHash])
    : await queryDirectDb(`INSERT INTO auth_challenge_limits(subject_hash,purpose,token_hash,expires_at)
        VALUES($1,$2,$3,$4) ON CONFLICT(subject_hash,purpose) DO UPDATE SET
        token_hash=EXCLUDED.token_hash, expires_at=EXCLUDED.expires_at, consumed=false,
        attempts=CASE WHEN auth_challenge_limits.window_started_at<=now()-interval '10 minutes' THEN 0 ELSE auth_challenge_limits.attempts END,
        sends=CASE WHEN auth_challenge_limits.window_started_at<=now()-interval '10 minutes' THEN 1 ELSE auth_challenge_limits.sends+1 END,
        window_started_at=CASE WHEN auth_challenge_limits.window_started_at<=now()-interval '10 minutes' THEN now() ELSE auth_challenge_limits.window_started_at END,
        sent_at=now() WHERE auth_challenge_limits.sent_at<=now()-interval '1 minute'
        AND (auth_challenge_limits.window_started_at<=now()-interval '10 minutes'
          OR (auth_challenge_limits.sends<5 AND auth_challenge_limits.attempts<5)) RETURNING subject_hash`,
      [meta.subjectHash, purpose, meta.tokenHash, meta.expiresAt]);
  return rows.length === 1;
}

/** Atomic across web workers: at most one caller consumes a correct code. */
export async function consumeAuthChallenge(token: string, email: string, purpose: Purpose, correct: boolean): Promise<boolean> {
  const meta = challengeMetadata(token, email, purpose);
  if (!meta) return false;
  const rows = await queryDirectDb(`UPDATE auth_challenge_limits SET attempts=attempts+1, consumed=$4
    WHERE subject_hash=$1 AND purpose=$2 AND token_hash=$3 AND NOT consumed
    AND expires_at>now() AND attempts<5 RETURNING consumed`,
  [meta.subjectHash, purpose, meta.tokenHash, correct]);
  return correct && rows.length === 1 && rows[0].consumed === true;
}
