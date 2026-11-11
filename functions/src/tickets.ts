import {createHmac, timingSafeEqual} from "crypto";

import {collections} from "./lib/collections";

// Admin API routes whose registrants receive a talks QR by email.
export const REGISTRATION_ROUTES = ["workshops", "competition"] as const;
export type RegistrationRoute = (typeof REGISTRATION_ROUTES)[number];

export const REGISTRATION_COLLECTION: Record<RegistrationRoute, string> = {
  workshops: collections.workshopSignups,
  competition: collections.competitionSignups,
};

export type CheckInEvent = "talks" | "competition";

// Signing scope for competition QRs. It differs from every route name, so a
// talks token can never be turned into a competition one (or vice versa).
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
 * Tells which event a scanned token is for, before verifying it.
 * @param {string} token The scanned text.
 * @return {CheckInEvent | null} talks, competition, or null if unknown.
 */
export function tokenEvent(token: string): CheckInEvent | null {
  const prefix = token.trim().split(".")[0];
  if (prefix === "QJ") return "talks";
  if (prefix === "QJC") return "competition";
  return null;
}

/**
 * Builds the text encoded in a registrant's talks QR.
 * @param {string} secret The server-side signing secret.
 * @param {RegistrationRoute} route Which registration route it belongs to.
 * @param {string} id The registration document ID.
 * @return {string} QJ.<route>.<id>.<signature>
 */
export function makeToken(
  secret: string,
  route: RegistrationRoute,
  id: string,
): string {
  return `QJ.${route}.${id}.${sign(secret, route, id)}`;
}

/**
 * Verifies a scanned talks token.
 * @param {string} secret The server-side signing secret.
 * @param {string} token The scanned text.
 * @return {{route: RegistrationRoute, id: string} | null} The registration
 *   it points to, or null if it is malformed or the signature is wrong.
 */
export function parseToken(
  secret: string,
  token: string,
): {route: RegistrationRoute; id: string} | null {
  // Registration IDs can contain dots (a doc ID may be an email address),
  // so the signature is the last part and the ID is everything in between.
  const [prefix, route, ...rest] = token.trim().split(".");
  const signature = rest.pop();
  const id = rest.join(".");
  if (prefix !== "QJ" || !id || !signature) return null;
  if (!REGISTRATION_ROUTES.includes(route as RegistrationRoute)) return null;
  if (!matches(sign(secret, route, id), signature)) return null;
  return {route: route as RegistrationRoute, id};
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
  const [prefix, ...rest] = token.trim().split(".");
  const signature = rest.pop();
  const id = rest.join(".");
  if (prefix !== "QJC" || !id || !signature) return null;
  if (!matches(sign(secret, COMPETITION_SCOPE, id), signature)) return null;
  return {id};
}