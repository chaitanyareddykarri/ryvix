import 'server-only';
import crypto from 'node:crypto';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
type ChallengeKind = 'login' | 'signup';
interface Challenge {
  kind: ChallengeKind;
  email: string;
  password: string;
  otp: string;
  timestamp: number;
  fullName?: string;
}

// Public Supabase keys cannot protect passwords or OTPs. Read the dedicated
// server secret lazily so builds do not require runtime credentials.
function challengeKey(): Buffer {
  const secret = process.env.AUTH_CHALLENGE_SECRET;
  if (!secret || !/^[a-f\d]{64}$/i.test(secret)) {
    throw new Error('AUTH_CHALLENGE_SECRET must contain 32 random bytes encoded as 64 hexadecimal characters');
  }
  return Buffer.from(secret, 'hex');
}

export function generateRandomOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function encryptData(value: Challenge): string {
  if (!/^\d{6}$/.test(value.otp) || !value.email || !value.password) {
    throw new Error('Email, password and a six-digit OTP are required');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', challengeKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

function readChallenge(token: string, expectedEmail: string, kind: ChallengeKind): Challenge | null {
  try {
    if (typeof token !== 'string' || token.length > 8192 || typeof expectedEmail !== 'string') return null;
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', challengeKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
    if (!data || data.kind !== kind || typeof data.email !== 'string' ||
        data.email !== expectedEmail.trim().toLowerCase() ||
        typeof data.password !== 'string' || !data.password ||
        typeof data.otp !== 'string' || !/^\d{6}$/.test(data.otp) ||
        !Number.isSafeInteger(data.timestamp) || data.timestamp > Date.now() ||
        Date.now() - data.timestamp >= CHALLENGE_TTL_MS ||
        (kind === 'signup' && (typeof data.fullName !== 'string' || !data.fullName.trim()))) return null;
    return data;
  } catch {
    return null;
  }
}

function matchesOtp(expected: string, submitted: string): boolean {
  return typeof submitted === 'string' && /^\d{6}$/.test(submitted.trim()) &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(submitted.trim()));
}

export function createSignupChallenge(params: { email: string; fullName: string; password: string; otp: string }): string {
  return encryptData({ ...params, kind: 'signup', email: params.email.trim().toLowerCase(),
    fullName: params.fullName.trim(), otp: params.otp.trim(), timestamp: Date.now() });
}

export function verifySignupChallenge(challenge: string, expectedEmail: string, submittedOtp: string): {
  valid: boolean; error?: string; userData?: { email: string; fullName: string; password: string };
} {
  const data = readChallenge(challenge, expectedEmail, 'signup');
  if (!data || !matchesOtp(data.otp, submittedOtp)) return { valid: false, error: 'Invalid, expired or incorrect verification code. Please restart registration.' };
  return { valid: true, userData: { email: data.email, fullName: data.fullName!, password: data.password } };
}

export function createLoginOtpChallenge(email: string, otp: string, password: string): string {
  return encryptData({ kind: 'login', email: email.trim().toLowerCase(), otp: otp.trim(), password, timestamp: Date.now() });
}

export function verifyLoginOtpChallenge(challenge: string, expectedEmail: string, submittedOtp: string): {
  valid: boolean; error?: string; password?: string;
} {
  const data = readChallenge(challenge, expectedEmail, 'login');
  if (!data || !matchesOtp(data.otp, submittedOtp)) return { valid: false, error: 'Invalid, expired or incorrect verification code. Please sign in again.' };
  return { valid: true, password: data.password };
}

export function renewLoginChallenge(challenge: string, email: string, otp: string): string {
  const data = readChallenge(challenge, email, 'login');
  if (!data) throw new Error('Invalid or expired login challenge');
  // Resends cannot extend a password-bearing cookie indefinitely.
  return encryptData({ ...data, otp });
}

export function renewSignupChallenge(challenge: string, email: string, otp: string): string {
  const data = readChallenge(challenge, email, 'signup');
  if (!data) throw new Error('Invalid or expired signup challenge');
  return encryptData({ ...data, otp });
}
