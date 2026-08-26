import {onCall, HttpsError} from "firebase-functions/https";
import {Timestamp} from "firebase-admin/firestore";

import {db} from "./admin";
import {isValidEmail, normalizeEmail, verificationId} from "./lib/otp";

const LEVELS = ["none", "basic", "intermediate"] as const;
type Level = (typeof LEVELS)[number];

/**
 * Asserts a value is a non-empty string, trimmed.
 * @param {unknown} value The value to check.
 * @param {string} field Field name used in the error message.
 * @return {string} The trimmed string.
 */
function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  return value.trim();
}

export const submitWorkshopSignup = onCall(async (request) => {
  const body = request.data as Record<string, unknown> | null;
  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  const verificationToken = requireNonEmptyString(
    body?.verificationToken,
    "verificationToken",
  );
  const name = requireNonEmptyString(body?.name, "name");
  const career = requireNonEmptyString(body?.career, "career");
  const rawLevel = body?.level;
  if (typeof rawLevel !== "string" || !LEVELS.includes(rawLevel as Level)) {
    throw new HttpsError("invalid-argument", "A valid level is required.");
  }
  const level = rawLevel as Level;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  const verRef = db
    .collection("emailVerifications")
    .doc(verificationId("workshops", email));
  const signupRef = db.collection("workshopSignups").doc(email);

  await db.runTransaction(async (tx) => {
    const verSnap = await tx.get(verRef);
    const signupSnap = await tx.get(signupRef);

    if (!verSnap.exists) {
      throw new HttpsError("failed-precondition", "Email not verified.");
    }
    const ver = verSnap.data()!;
    if (
      !ver.verified ||
      ver.verificationToken !== verificationToken ||
      ver.consumedAt
    ) {
      throw new HttpsError("failed-precondition", "Email not verified.");
    }
    const expiresAt = ver.expiresAt as Timestamp;
    if (Timestamp.now().toMillis() > expiresAt.toMillis()) {
      throw new HttpsError(
        "failed-precondition",
        "Verification expired, request a new code.",
      );
    }
    if (signupSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "This email is already registered.",
      );
    }

    const now = Timestamp.now();
    tx.create(signupRef, {
      email,
      name,
      career,
      level,
      reason,
      status: "pending",
      createdAt: now,
    });
    tx.update(verRef, {consumedAt: now});
  });

  return {ok: true};
});
