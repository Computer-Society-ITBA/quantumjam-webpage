import * as crypto from "crypto";

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_S = 30;
export const MAX_VERIFY_ATTEMPTS = 5;
export const MAX_REQUESTS_PER_HOUR = 5;

export type Purpose = "workshops" | "competition";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DOT_ALIAS_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Trims and lowercases an email so it's stable as a Firestore doc ID.
 * @param {string} email Raw email as typed by the user.
 * @return {string} The normalized email.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Collapses provider aliases (plus-tags, and dots on Gmail) so that
 * hola+123@gmail.com and hola@gmail.com resolve to the same identity.
 * Use this ONLY as a dedup / rate-limit key: mail is still delivered to
 * the address the user actually typed.
 * @param {string} email Email to canonicalize.
 * @return {string} The canonical form of the email.
 */
export function canonicalEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const [rawLocal, domain] = normalized.split("@");
  if (!rawLocal || !DOT_ALIAS_DOMAINS.has(domain)) {
    return normalized;
  }

  const local = rawLocal.split("+")[0].replace(/\./g, "");
  return local ? `${local}@gmail.com` : normalized;
}

/**
 * Checks an email against a permissive syntax pattern.
 * @param {string} email Email to validate.
 * @return {boolean} Whether the email looks valid.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Generates a random zero-padded numeric verification code.
 * @return {string} A CODE_LENGTH-digit code.
 */
export function generateCode(): string {
  const max = 10 ** CODE_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(CODE_LENGTH, "0");
}

/**
 * Hashes a code so the plaintext is never stored in Firestore.
 * @param {string} code The code to hash.
 * @return {string} The sha256 hex digest.
 */
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Derives the deterministic emailVerifications doc ID for an
 * (email, purpose) pair.
 * @param {Purpose} purpose Which sign-up flow this verification is for.
 * @param {string} email The email being verified.
 * @return {string} The doc ID.
 */
export function verificationId(purpose: Purpose, email: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(canonicalEmail(email))
    .digest("hex")
    .slice(0, 32);
  return `${purpose}_${hash}`;
}

/**
 * Generates an opaque single-use token to prove a code was confirmed.
 * @return {string} A random hex token.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
