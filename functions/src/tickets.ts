import {createHmac, timingSafeEqual} from "crypto";

// Signing scope for competition QRs.
const COMPETITION_SCOPE = "competition-checkin";

/**
 * Signs a registration so a QR cannot be forged for someone else's ID.
 * @param {string} secret The server-side signing secret.
 * @param {string} scope What the signature is valid for.
 * @param {string} id The registration document ID.
 * @return {string} A short URL-safe signature.
 */
function sign(secret: string, scope: string, id: string): string {
  return createHmac("sha256", secret)
    .update(`${scope}.${id}`)
    .digest("base64url")
    .slice(0, 22);
}

/**
 * Compares a given signature with the expected one in constant time.
 * @param {string} expected The signature we computed.
 * @param {string} given The signature from the scanned token.
 * @return {boolean} Whether they match.
 */
function matches(expected: string, given: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Builds the text encoded in a competition check-in QR.
 * @param {string} secret The server-side signing secret.
 * @param {string} id The competition signup document ID.
 * @return {string} QJC.<id>.<signature>
 */
export function makeCompetitionToken(secret: string, id: string): string {
  return `QJC.${id}.${sign(secret, COMPETITION_SCOPE, id)}`;
}

/**
 * Verifies a scanned competition token.
 * @param {string} secret The server-side signing secret.
 * @param {string} token The scanned text.
 * @return {{id: string} | null} The signup it points to, or null if it is
 *   malformed or the signature is wrong.
 */
export function parseCompetitionToken(
  secret: string,
  token: string,
): {id: string} | null {
  // Signup IDs are email addresses and contain dots, so the signature is
  // the last part and the ID is everything in between.
  const [prefix, ...rest] = token.trim().split(".");
  const signature = rest.pop();
  const id = rest.join(".");
  if (prefix !== "QJC" || !id || !signature) return null;
  if (!matches(sign(secret, COMPETITION_SCOPE, id), signature)) return null;
  return {id};
}
