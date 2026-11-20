import {onCall, HttpsError} from "firebase-functions/https";
import {DocumentReference, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

import {db} from "../admin";
import {collections} from "../lib/collections";
import {resolveLang} from "../lib/i18n";
import {GMAIL_APP_PASSWORD, sendVerificationCodeEmail} from "../lib/email";
import {ENVIRONMENT} from "../lib/environment";
import {
  CODE_TTL_MS,
  MAX_REQUESTS_PER_HOUR,
  MAX_VERIFY_ATTEMPTS,
  RESEND_COOLDOWN_S,
  canonicalEmail,
  generateCode,
  hashCode,
  isValidEmail,
  normalizeEmail,
} from "../lib/otp";
import {
  SESSION_TTL_MS,
  generateSessionToken,
  hashToken,
  playerId,
  readMarket,
  safeEqualHex,
} from "./store";

const HOUR_MS = 60 * 60 * 1000;

type PublicPlayer = {
  playerId: string;
  displayName: string;
  cash: number;
  holdings: Record<string, number>;
};

/**
 * The competitor's full name from their competition sign-up, or null when
 * the email is not registered. Only registered competitors may join the
 * market, and they always play under their sign-up name.
 * @param {string} email The email to look up.
 * @return {Promise<string | null>} The full name, or null if not found.
 */
async function competitorName(email: string): Promise<string | null> {
  const snap = await db
    .collection(collections.competitionSignups)
    .doc(canonicalEmail(email))
    .get();
  const data = snap.data();
  if (!data) return null;
  const first = typeof data.firstName === "string" ? data.firstName : "";
  const last = typeof data.lastName === "string" ? data.lastName : "";
  const name = `${first} ${last}`.replace(/\s+/g, " ").trim();
  return name || "Participante";
}

/**
 * Rejects the request unless the email belongs to a registered competitor.
 * @param {string} email The email to check.
 * @return {Promise<string>} The competitor's name.
 */
async function requireCompetitor(email: string): Promise<string> {
  const name = await competitorName(email);
  if (!name) {
    throw new HttpsError(
      "permission-denied",
      "This email is not registered for the competition.",
    );
  }
  return name;
}

/**
 * Rejects the request unless the game exists and is not already settled.
 * @return {Promise<void>} Resolves when auth is allowed.
 */
async function assertAuthOpen(): Promise<void> {
  const market = await readMarket();
  if (!market || market.phase === "settled") {
    throw new HttpsError(
      "failed-precondition",
      "The market is not accepting new players right now.",
    );
  }
}

/**
 * Validates the shared {email} field of a request.
 * @param {unknown} data Raw onCall data.
 * @return {string} The normalized email.
 */
function readEmail(data: unknown): string {
  const body = data as {email?: unknown} | null;
  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  return email;
}

/**
 * Atomically enforces the resend cooldown and hourly cap, then stores the
 * new code hash. Pure Firestore work, safe to retry on contention.
 * @param {DocumentReference} ref The jamVerifications doc.
 * @param {string} email The email being verified.
 * @param {string} codeHash The hashed code to store.
 * @return {Promise<void>} Resolves once the slot is claimed.
 */
async function claimSlot(
  ref: DocumentReference,
  email: string,
  codeHash: string,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
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

    tx.set(ref, {
      email,
      codeHash,
      attempts: 0,
      requestCount: requestCount + 1,
      windowStart: windowExpired ? now : windowStart,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + CODE_TTL_MS),
      lastRequestAt: now,
    });
  });
}

/**
 * Creates or refreshes the player's browser session, writing the token
 * hash to the private secrets doc and returning the player's public state.
 * @param {string} email The verified email.
 * @param {string} name The competitor's sign-up name to play under.
 * @return {Promise<object>} The player and the plaintext session token to
 *   store in the browser.
 */
async function openSession(
  email: string,
  name: string,
): Promise<{player: PublicPlayer; sessionToken: string}> {
  const market = await readMarket();
  if (!market) {
    throw new HttpsError("failed-precondition", "The market is not set up.");
  }
  const id = playerId(email);
  const playerRef = db.collection(collections.jamPlayers).doc(id);
  const token = generateSessionToken();

  const player = await db.runTransaction(async (tx) => {
    const snap = await tx.get(playerRef);
    const now = Timestamp.now();

    let cash: number;
    let holdings: Record<string, number>;
    if (snap.exists) {
      const data = snap.data()!;
      cash = (data.cash as number | undefined) ?? market.startingCash;
      holdings = (data.holdings as Record<string, number> | undefined) ?? {};
      tx.update(playerRef, {displayName: name, updatedAt: now});
    } else {
      cash = market.startingCash;
      holdings = {};
      tx.set(playerRef, {
        displayName: name,
        cash,
        holdings,
        joinedAt: now,
        updatedAt: now,
      });
    }

    tx.set(db.collection(collections.jamPlayerSecrets).doc(id), {
      email,
      canonicalEmail: canonicalEmail(email),
      sessionTokenHash: hashToken(token),
      sessionExpiresAt: Timestamp.fromMillis(now.toMillis() + SESSION_TTL_MS),
      updatedAt: now,
    });

    return {playerId: id, displayName: name, cash, holdings};
  });

  return {player, sessionToken: token};
}

/**
 * Loads a player by id and checks the session token against the stored
 * hash. Throws unauthenticated when the session is missing or expired.
 * @param {string} id The player id.
 * @param {string} token The plaintext session token from the browser.
 * @return {Promise<PublicPlayer>} The player's public state.
 */
export async function requireSession(
  id: string,
  token: string,
): Promise<PublicPlayer> {
  if (typeof id !== "string" || typeof token !== "string" || !token) {
    throw new HttpsError("unauthenticated", "Sign in to play.");
  }
  const secretSnap = await db
    .collection(collections.jamPlayerSecrets)
    .doc(id)
    .get();
  const secret = secretSnap.data();
  if (!secret) throw new HttpsError("unauthenticated", "Sign in to play.");

  const storedHash = (secret.sessionTokenHash as string | undefined) ?? "";
  const expiresAt = secret.sessionExpiresAt as Timestamp | undefined;
  const expired =
    !expiresAt || Timestamp.now().toMillis() > expiresAt.toMillis();
  if (!storedHash || expired || !safeEqualHex(storedHash, hashToken(token))) {
    throw new HttpsError("unauthenticated", "Your session has expired.");
  }

  const playerSnap = await db.collection(collections.jamPlayers).doc(id).get();
  const player = playerSnap.data();
  if (!player) throw new HttpsError("unauthenticated", "Sign in to play.");

  return {
    playerId: id,
    displayName: (player.displayName as string | undefined) ?? "",
    cash: (player.cash as number | undefined) ?? 0,
    holdings: (player.holdings as Record<string, number> | undefined) ?? {},
  };
}

export const jamRequestCode = onCall(
  {secrets: [GMAIL_APP_PASSWORD]},
  async (request) => {
    await assertAuthOpen();
    const email = readEmail(request.data);
    // Never send a code to someone who could not finish signing in.
    await requireCompetitor(email);
    const lang = resolveLang(
      typeof (request.data as {lang?: unknown})?.lang === "string" ?
        (request.data as {lang: string}).lang :
        undefined,
    );

    const code = generateCode();
    const ref = db
      .collection(collections.jamVerifications)
      .doc(playerId(email));
    await claimSlot(ref, email, hashCode(code));

    try {
      if (ENVIRONMENT === "development") {
        logger.info(`DEV: jam code for ${email} is ${code}`);
      } else {
        await sendVerificationCodeEmail(email, code, lang);
      }
    } catch {
      await ref.update({lastRequestAt: null});
      throw new HttpsError(
        "internal",
        "Could not send the verification email. Please try again.",
      );
    }

    return {ok: true, cooldownSeconds: RESEND_COOLDOWN_S};
  },
);

export const jamConfirmCode = onCall(async (request) => {
  await assertAuthOpen();
  const email = readEmail(request.data);
  const body = request.data as {code?: unknown};
  const code = typeof body.code === "string" ? body.code : "";
  if (!/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "A 6-digit code is required.");
  }
  const name = await requireCompetitor(email);

  const ref = db
    .collection(collections.jamVerifications)
    .doc(playerId(email));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new HttpsError("not-found", "No code in progress for this email.");
    }
    const data = snap.data()!;
    const now = Timestamp.now();
    if (now.toMillis() > (data.expiresAt as Timestamp).toMillis()) {
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
      tx.update(ref, {attempts: attempts + 1});
      throw new HttpsError("invalid-argument", "Incorrect code.");
    }
    tx.delete(ref);
  });

  const {player, sessionToken} = await openSession(email, name);
  return {ok: true, sessionToken, ...player};
});

export const jamSession = onCall(async (request) => {
  const body = request.data as {playerId?: unknown; sessionToken?: unknown};
  const id = typeof body.playerId === "string" ? body.playerId : "";
  const token = typeof body.sessionToken === "string" ? body.sessionToken : "";
  const player = await requireSession(id, token);
  return {ok: true, ...player};
});
