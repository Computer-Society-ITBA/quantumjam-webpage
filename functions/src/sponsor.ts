import {onCall, HttpsError} from "firebase-functions/https";
import {Timestamp} from "firebase-admin/firestore";

import {db} from "./admin";
import {resolveLang} from "./lib/i18n/index";
import {isValidEmail, normalizeEmail} from "./lib/otp";

const NAME_MAX = 120;
const ORG_MAX = 160;
const MESSAGE_MAX = 2000;

/**
 * Trims a required string field and caps its length.
 * @param {unknown} value Raw field value.
 * @param {string} field Field name used in error messages.
 * @param {number} max Maximum allowed length after trimming.
 * @return {string} Validated string.
 */
function requireString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new HttpsError("invalid-argument", `${field} is too long.`);
  }
  return trimmed;
}

/**
 * Trims an optional string field and caps its length.
 * @param {unknown} value Raw field value.
 * @param {string} field Field name used in error messages.
 * @param {number} max Maximum allowed length after trimming.
 * @return {string} Validated string, or "" if not provided.
 */
function optionalString(value: unknown, field: string, max: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new HttpsError("invalid-argument", `${field} is too long.`);
  }
  return trimmed;
}

/**
 * Public sponsor inquiry: someone interested in sponsoring the event
 * fills a short form and their contact info lands in Firestore under
 * `sponsorInquiries`, one document per submission. Unlike sign-ups this
 * has no email verification loop; the organizers reach out by email.
 */
export const submitSponsorInquiry = onCall(async (request) => {
  const body = request.data as Record<string, unknown> | null;

  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }

  const name = requireString(body?.name, "name", NAME_MAX);
  const organization = requireString(
    body?.organization,
    "organization",
    ORG_MAX,
  );
  const message = optionalString(body?.message, "message", MESSAGE_MAX);
  const lang = resolveLang(
    typeof body?.lang === "string" ? body.lang : undefined,
  );

  await db.collection("sponsorInquiries").add({
    email,
    name,
    organization,
    message,
    status: "new",
    createdAt: Timestamp.now(),
    lang,
  });

  return {ok: true};
});
