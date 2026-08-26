import {onCall, HttpsError} from "firebase-functions/https";
import {DocumentReference, Timestamp} from "firebase-admin/firestore";

import {db} from "./admin";
import {
  CODE_TTL_MS,
  MAX_REQUESTS_PER_HOUR,
  MAX_VERIFY_ATTEMPTS,
  RESEND_COOLDOWN_S,
  generateCode,
  generateToken,
  hashCode,
  isValidEmail,
  normalizeEmail,
  verificationId,
  type Purpose,
} from "./lib/otp";
import {GMAIL_APP_PASSWORD, sendVerificationCodeEmail} from "./lib/email";

const PURPOSES: Purpose[] = ["workshops", "competition"];
const HOUR_MS = 60 * 60 * 1000;

/**
 * Validates and normalizes the shared {email, purpose} request shape.
 * @param {unknown} data Raw onCall request data.
 * @return {{email: string, purpose: Purpose}} The validated fields.
 */
function assertValidRequest(data: unknown): {email: string; purpose: Purpose} {
  const body = data as {email?: unknown; purpose?: unknown} | null;
  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  const purpose = body?.purpose;
  if (typeof purpose !== "string" || !PURPOSES.includes(purpose as Purpose)) {
    throw new HttpsError("invalid-argument", "A valid purpose is required.");
  }
  return {email, purpose: purpose as Purpose};
}

/**
 * Maps a purpose to its sign-up collection name.
 * @param {Purpose} purpose Which sign-up flow.
 * @return {string} The Firestore collection name.
 */
function signupCollection(purpose: Purpose): string {
  return purpose === "workshops" ? "workshopSignups" : "competitionSignups";
}

/**
 * Atomically checks the resend cooldown and hourly request cap, then
 * reserves the slot by writing the new (unsent) code. Pure Firestore work
 * only — no I/O side effects — so it's safe for the transaction to retry
 * on contention.
 * @param {DocumentReference} verRef The emailVerifications doc reference.
 * @param {string} email The email being verified.
 * @param {Purpose} purpose Which sign-up flow this code is for.
 * @param {string} codeHash The hashed code to store.
 * @return {Promise<void>} Resolves once the slot is claimed.
 */
async function claimVerificationSlot(
  verRef: DocumentReference,
  email: string,
  purpose: Purpose,
  codeHash: string,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(verRef);
    const now = Timestamp.now();
    const data = snap.exists ? snap.data()! : null;

    const lastRequestAt = data?.lastRequestAt as Timestamp | undefined;
    if (
      lastRequestAt &&
      now.toMillis() - lastRequestAt.toMillis() < RESEND_COOLDOWN_S * 1000
    ) {
      throw new HttpsError(
        "resource-exhausted",
        "Please wait before requesting another code.",
      );
    }

    const windowStart = (data?.windowStart as Timestamp | undefined) ?? now;
    const windowExpired = now.toMillis() - windowStart.toMillis() > HOUR_MS;
    const requestCount = windowExpired ?
      0 :
      ((data?.requestCount as number | undefined) ?? 0);
    if (requestCount >= MAX_REQUESTS_PER_HOUR) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many code requests. Try again later.",
      );
    }

    tx.set(verRef, {
      email,
      purpose,
      codeHash,
      attempts: 0,
      requestCount: requestCount + 1,
      windowStart: windowExpired ? now : windowStart,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + CODE_TTL_MS),
      lastRequestAt: now,
      verified: false,
      verifiedAt: null,
      verificationToken: null,
      consumedAt: null,
    });
  });
}

export const requestVerificationCode = onCall(
  {secrets: [GMAIL_APP_PASSWORD]},
  async (request) => {
    const {email, purpose} = assertValidRequest(request.data);

    const signupRef = db.collection(signupCollection(purpose)).doc(email);
    const signupSnap = await signupRef.get();
    if (signupSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "This email is already registered for this event.",
      );
    }

    const code = generateCode();
    const verRef = db
      .collection("emailVerifications")
      .doc(verificationId(purpose, email));

    await claimVerificationSlot(verRef, email, purpose, hashCode(code));

    try {
      await sendVerificationCodeEmail(email, code);
    } catch {
      // Don't leave the user cooldown-locked if delivery failed.
      await verRef.update({lastRequestAt: null});
      throw new HttpsError(
        "internal",
        "Could not send the verification email. Please try again.",
      );
    }

    return {ok: true, cooldownSeconds: RESEND_COOLDOWN_S};
  },
);

export const confirmVerificationCode = onCall(async (request) => {
  const {email, purpose} = assertValidRequest(request.data);
  const body = request.data as {code?: unknown};
  const code = typeof body.code === "string" ? body.code : "";
  if (!/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "A 6-digit code is required.");
  }

  const verRef = db
    .collection("emailVerifications")
    .doc(verificationId(purpose, email));

  const verificationToken = await db.runTransaction(async (tx) => {
    const snap = await tx.get(verRef);
    if (!snap.exists) {
      throw new HttpsError(
        "not-found",
        "No verification in progress for this email.",
      );
    }
    const data = snap.data()!;
    const now = Timestamp.now();
    const expiresAt = data.expiresAt as Timestamp;
    if (now.toMillis() > expiresAt.toMillis()) {
      throw new HttpsError("deadline-exceeded", "This code has expired.");
    }
    const attempts = (data.attempts as number | undefined) ?? 0;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many incorrect attempts.",
      );
    }
    if (data.codeHash !== hashCode(code)) {
      tx.update(verRef, {attempts: attempts + 1});
      throw new HttpsError("invalid-argument", "Incorrect code.");
    }

    const token = generateToken();
    tx.update(verRef, {
      verified: true,
      verifiedAt: now,
      verificationToken: token,
      attempts: 0,
    });
    return token;
  });

  return {ok: true, verificationToken};
});
