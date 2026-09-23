import crypto from "crypto";

const CHALLENGE_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "ryvix-auth-challenge-secret-salt-2026";

const CHALLENGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

export function createLoginChallenge(email: string): string {
  const timestamp = Date.now();
  const payload = `${email.toLowerCase()}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CHALLENGE_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyLoginChallenge(
  challenge: string,
  expectedEmail: string
): { valid: boolean; error?: string } {
  try {
    const decoded = Buffer.from(challenge, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) {
      return { valid: false, error: "Malformed challenge" };
    }

    const [email, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (email.toLowerCase() !== expectedEmail.toLowerCase()) {
      return { valid: false, error: "Email mismatch" };
    }

    if (Date.now() - timestamp > CHALLENGE_TTL_MS) {
      return { valid: false, error: "Challenge expired" };
    }

    const expectedPayload = `${email}:${timestampStr}`;
    const expectedSignature = crypto
      .createHmac("sha256", CHALLENGE_SECRET)
      .update(expectedPayload)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to verify challenge" };
  }
}
