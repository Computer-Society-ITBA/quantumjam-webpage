import {createHash, randomBytes, timingSafeEqual} from "crypto";
import {Timestamp} from "firebase-admin/firestore";

import {db} from "../admin";
import {collections, JAM_MARKET_DOC} from "../lib/collections";
import {canonicalEmail} from "../lib/otp";
import {prices, type QVector} from "./lmsr";

export type JamPhase = "setup" | "open" | "frozen" | "settled";

export type JamTeam = {id: string; name: string};

export type JamMarket = {
  phase: JamPhase;
  b: number;
  startingCash: number;
  payouts: number[];
  teams: JamTeam[];
  q: QVector;
  prices: Record<string, number>;
  // Once set, only these teams can be traded or win; the rest are at 0.
  finalists: string[] | null;
  finalistsAt: Timestamp | null;
  podium: string[] | null;
  openedAt: Timestamp | null;
  frozenAt: Timestamp | null;
  settledAt: Timestamp | null;
  updatedAt: Timestamp;
};

// A browser session lasts well beyond the one-day event, so a player who
// verified in the morning stays signed in all day without re-entering a code.
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Deterministic player id for an email, so one address is always one
 * account. Derived from the canonical email (plus-tags and Gmail dots
 * collapsed) and never contains the address itself.
 * @param {string} email The player's email.
 * @return {string} The player document id.
 */
export function playerId(email: string): string {
  const hash = createHash("sha256")
    .update(canonicalEmail(email))
    .digest("hex")
    .slice(0, 32);
  return `p_${hash}`;
}

/**
 * Hashes a session token so the plaintext is never stored.
 * @param {string} token The session token.
 * @return {string} The sha256 hex digest.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a new opaque session token.
 * @return {string} A random hex token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Constant-time comparison of two hex digests of equal length.
 * @param {string} a First digest.
 * @param {string} b Second digest.
 * @return {boolean} Whether they match.
 */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Reads the single market document, or null when the game has not been set
 * up yet.
 * @return {Promise<JamMarket | null>} The market state, or null.
 */
export async function readMarket(): Promise<JamMarket | null> {
  const snap = await db
    .collection(collections.jamMarket)
    .doc(JAM_MARKET_DOC)
    .get();
  return snap.exists ? (snap.data() as JamMarket) : null;
}

/**
 * Recomputes the price map for a q vector. Kept beside the store so every
 * write that touches `q` can refresh the stored prices in the same step.
 * @param {QVector} q Shares outstanding per team.
 * @param {number} b Liquidity parameter.
 * @return {Record<string, number>} Price per team id.
 */
export function pricesFor(q: QVector, b: number): Record<string, number> {
  return prices(q, b);
}
