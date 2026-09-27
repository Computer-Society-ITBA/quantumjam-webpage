import {createHash, timingSafeEqual} from "crypto";
import type {Response} from "express";
import {Timestamp} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";

import {db} from "./admin";

const ADMIN_USERNAME = defineSecret("QUANTUMJAM_ADMIN_USERNAME");
const ADMIN_PASSWORD = defineSecret("QUANTUMJAM_ADMIN_PASSWORD");

const ROUTE_PREFIX = "/api/admin/";

// Every route reads one fixed collection and returns only the listed
// fields, so a new field written by a sign-up flow never leaks here by
// accident. Timestamp fields are serialized as ISO 8601 UTC strings.
const ROUTES = {
  workshops: {
    collection: "workshopSignups",
    fields: [
      "email", "name", "career", "level", "reason", "status", "createdAt",
      "lang",
    ],
  },
  competition: {
    collection: "competitionSignups",
    fields: [
      "email", "dni", "age", "university", "major", "gradYear", "location",
      "diet", "github", "linkedin", "x", "instagram", "website",
      "teamChoice", "teamId", "status", "createdAt", "lang",
    ],
  },
  contacts: {
    collection: "emailContacts",
    fields: [
      "email", "canonicalEmail", "status", "purposes", "firstSeenAt",
      "updatedAt", "verifiedAt",
    ],
  },
} as const;

type RouteName = keyof typeof ROUTES;
type FieldValue = string | string[] | null;
type Row = Record<string, FieldValue>;
type Secret = ReturnType<typeof defineSecret>;

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const PRINTABLE_ASCII_RE = /^[\x20-\x7E]*$/;

/**
 * Reads a secret's value, treating a missing or unreadable one as unset.
 * @param {Secret} secret The secret to read.
 * @return {string} The value, or "" if it isn't available.
 */
function readSecret(secret: Secret): string {
  try {
    return secret.value();
  } catch {
    return "";
  }
}

/**
 * Parses an `Authorization: Basic ...` header. The username ends at the
 * first colon, so the password may contain colons.
 * @param {string | undefined} header The raw Authorization header.
 * @return {{username: string, password: string} | null} The credentials,
 *   or null if the header is missing or malformed.
 */
function parseBasicAuth(
  header: string | undefined,
): {username: string; password: string} | null {
  const [scheme, encoded, ...rest] = (header ?? "").trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "basic" || !encoded || rest.length > 0) {
    return null;
  }
  if (!BASE64_RE.test(encoded) || encoded.length % 4 !== 0) return null;

  const decoded = Buffer.from(encoded, "base64").toString("latin1");
  if (!PRINTABLE_ASCII_RE.test(decoded)) return null;

  const separator = decoded.indexOf(":");
  if (separator < 0) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

/**
 * Compares two strings in constant time with respect to their contents.
 * Hashing first gives both sides the same length, which timingSafeEqual
 * requires, without leaking the expected length.
 * @param {string} actual The value the client sent.
 * @param {string} expected The configured value.
 * @return {boolean} Whether they match.
 */
function safeEqual(actual: string, expected: string): boolean {
  const digest = (value: string) =>
    createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

/**
 * Converts a Firestore value into the JSON shape the backoffice expects.
 * @param {unknown} value The raw field value.
 * @return {FieldValue} A string, a list of strings, or null.
 */
function serializeValue(value: unknown): FieldValue {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return null;
}

/**
 * Reads a whole collection, keeping only the route's allowed fields.
 * Unordered on purpose: ordering by an optional field would silently
 * drop documents that lack it. The frontend sorts.
 * @param {RouteName} route Which route's collection to read.
 * @return {Promise<Row[]>} One row per document, keyed by field name.
 */
async function readRows(route: RouteName): Promise<Row[]> {
  const {collection, fields} = ROUTES[route];
  const snap = await db.collection(collection).get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    const row: Row = {id: doc.id};
    for (const field of fields) row[field] = serializeValue(data[field]);
    return row;
  });
}

/**
 * Sends a JSON error body.
 * @param {Response} res The response to write to.
 * @param {number} status HTTP status code.
 * @param {string} error Short machine-readable error code.
 */
function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({error});
}

/**
 * Read-only API behind /admin. Every request is authenticated before any
 * Firestore read, whether it arrives through the Hosting rewrite or at
 * the function's own URL. Credentials live only in Secret Manager.
 */
export const quantumjamAdminApi = onRequest(
  {region: "us-central1", secrets: [ADMIN_USERNAME, ADMIN_PASSWORD]},
  async (req, res) => {
    res.set("Cache-Control", "private, no-store");

    const expectedUsername = readSecret(ADMIN_USERNAME);
    const expectedPassword = readSecret(ADMIN_PASSWORD);
    if (!expectedUsername || !expectedPassword) {
      logger.error("Backoffice credentials are not configured");
      sendError(res, 500, "not-configured");
      return;
    }

    const credentials = parseBasicAuth(req.get("authorization"));
    const usernameOk = safeEqual(
      credentials?.username ?? "",
      expectedUsername,
    );
    const passwordOk = safeEqual(
      credentials?.password ?? "",
      expectedPassword,
    );
    if (!credentials || !usernameOk || !passwordOk) {
      res.set("WWW-Authenticate", "Basic realm=\"QuantumJam Admin\"");
      sendError(res, 401, "unauthorized");
      return;
    }

    if (req.method !== "GET") {
      res.set("Allow", "GET");
      sendError(res, 405, "method-not-allowed");
      return;
    }

    const path = req.path.replace(/\/+$/, "");
    const route = path.startsWith(ROUTE_PREFIX) ?
      path.slice(ROUTE_PREFIX.length) :
      "";
    if (!Object.prototype.hasOwnProperty.call(ROUTES, route)) {
      sendError(res, 404, "not-found");
      return;
    }

    try {
      const items = await readRows(route as RouteName);
      res.status(200).json({items, fetchedAt: new Date().toISOString()});
    } catch (err) {
      logger.error("Backoffice read failed", {route, err});
      sendError(res, 500, "internal");
    }
  },
);
