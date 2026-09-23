import crypto from "crypto";

const CHALLENGE_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "ryvix-auth-challenge-secret-salt-2026";

const KEY = crypto.createHash("sha256").update(CHALLENGE_SECRET).digest();
const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generates a genuine cryptographically random 6-digit OTP code (100000 - 999999).
 */
export function generateRandomOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Masks an email for safe display in UI (e.g. c***6@gmail.com).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "u***@example.com";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}***${last}@${domain}`;
}

// Encrypt payload using AES-256-GCM
function encryptData(obj: any): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const text = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

// Decrypt payload using AES-256-GCM
function decryptData(tokenStr: string): any | null {
  try {
    const raw = Buffer.from(tokenStr, "base64url");
    if (raw.length < 28) return null; // 12 iv + 16 tag
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Creates an encrypted challenge cookie for Sign Up with genuine random OTP.
 */
export function createSignupChallenge(params: {
  email: string;
  fullName: string;
  password: string;
  otp: string;
}): string {
  return encryptData({
    email: params.email.toLowerCase().trim(),
    fullName: params.fullName.trim(),
    password: params.password,
    otp: params.otp.trim(),
    timestamp: Date.now(),
  });
}

/**
 * Verifies the 6-digit OTP against the encrypted Sign Up challenge.
 */
export function verifySignupChallenge(
  challenge: string,
  expectedEmail: string,
  submittedOtp: string
): {
  valid: boolean;
  error?: string;
  userData?: { email: string; fullName: string; password: string };
} {
  const data = decryptData(challenge);
  if (!data) {
    return { valid: false, error: "Invalid or tampered verification session." };
  }

  if (Date.now() - data.timestamp > CHALLENGE_TTL_MS) {
    return { valid: false, error: "This verification code has expired. Please request a new code." };
  }

  if (data.email.toLowerCase() !== expectedEmail.toLowerCase().trim()) {
    return { valid: false, error: "Email mismatch. Please start registration again." };
  }

  if (data.otp.trim() !== submittedOtp.trim()) {
    return { valid: false, error: "The verification code is incorrect. Please try again." };
  }

  return {
    valid: true,
    userData: {
      email: data.email,
      fullName: data.fullName,
      password: data.password,
    },
  };
}

/**
 * Creates an encrypted challenge cookie for 2FA Login with genuine random OTP.
 */
export function createLoginOtpChallenge(email: string, otp: string): string {
  return encryptData({
    email: email.toLowerCase().trim(),
    otp: otp.trim(),
    timestamp: Date.now(),
  });
}

/**
 * Verifies the 6-digit OTP against the encrypted Login challenge.
 */
export function verifyLoginOtpChallenge(
  challenge: string,
  expectedEmail: string,
  submittedOtp: string
): { valid: boolean; error?: string } {
  const data = decryptData(challenge);
  if (!data) {
    return { valid: false, error: "Invalid or tampered login session." };
  }

  if (Date.now() - data.timestamp > CHALLENGE_TTL_MS) {
    return { valid: false, error: "This verification code has expired. Please request a new code." };
  }

  if (data.email.toLowerCase() !== expectedEmail.toLowerCase().trim()) {
    return { valid: false, error: "Email mismatch." };
  }

  if (data.otp.trim() !== submittedOtp.trim()) {
    return { valid: false, error: "The verification code is incorrect. Please try again." };
  }

  return { valid: true };
}

// Backward-compatibility aliases
export function createLoginChallenge(email: string): string {
  return createLoginOtpChallenge(email, "000000");
}

export function verifyLoginChallenge(
  challenge: string,
  expectedEmail: string
): { valid: boolean; error?: string } {
  const data = decryptData(challenge);
  if (!data) return { valid: false, error: "Invalid challenge" };
  if (Date.now() - data.timestamp > CHALLENGE_TTL_MS) return { valid: false, error: "Challenge expired" };
  if (data.email.toLowerCase() !== expectedEmail.toLowerCase().trim()) return { valid: false, error: "Email mismatch" };
  return { valid: true };
}
