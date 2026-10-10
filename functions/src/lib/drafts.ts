import {HttpsError} from "firebase-functions/https";
import {
  DocumentReference,
  DocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";

import {db} from "../admin";
import {verificationId, type Purpose} from "./otp";

export const SIGNUP_DRAFTS_COLLECTION = "signupDrafts";

// Steps whose completion is recorded on a draft, in wizard order. A
// flow's last step is only complete once the sign-up itself is submitted,
// so it is saved as a partial draft and never marked as completed: that
// covers the single workshops step and the competition's team step.
export const DRAFT_STEP_ORDER: Record<Purpose, readonly string[]> = {
  workshops: [],
  competition: ["personal", "socials"],
};

export type SignupDraft = {
  lastCompletedStep: string | null;
  data: Record<string, string>;
};

/**
 * Maps a purpose to its sign-up collection name.
 * @param {Purpose} purpose Which sign-up flow.
 * @return {string} The Firestore collection name.
 */
export function signupCollection(purpose: Purpose): string {
  return purpose === "workshops" ? "workshopSignups" : "competitionSignups";
}

/**
 * Builds the signupDrafts doc reference for an (email, purpose) pair.
 * Keyed like emailVerifications, so aliases of one address share a draft.
 * @param {Purpose} purpose Which sign-up flow the draft belongs to.
 * @param {string} email The email the draft belongs to.
 * @return {DocumentReference} The draft doc reference.
 */
export function draftRef(purpose: Purpose, email: string): DocumentReference {
  return db
    .collection(SIGNUP_DRAFTS_COLLECTION)
    .doc(verificationId(purpose, email));
}

/**
 * Asserts an emailVerifications doc proves the caller confirmed a code:
 * verified, holding the caller's token, not yet consumed, not expired.
 * @param {DocumentSnapshot} verSnap The emailVerifications snapshot.
 * @param {string} verificationToken The token the caller presented.
 */
export function assertVerifiedSession(
  verSnap: DocumentSnapshot,
  verificationToken: string,
): void {
  const ver = verSnap.data();
  if (
    !ver ||
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
}

/**
 * Loads the in-progress sign-up for an address, if any. Only call this
 * once the caller has proven they own the address: a draft holds personal
 * data, and its mere existence must not leak to someone typing the email.
 * @param {Purpose} purpose Which sign-up flow.
 * @param {string} email The verified email.
 * @return {Promise<SignupDraft | null>} The draft, or null if none.
 */
export async function loadDraft(
  purpose: Purpose,
  email: string,
): Promise<SignupDraft | null> {
  const snap = await draftRef(purpose, email).get();
  const draft = snap.data();
  if (!draft) return null;
  return {
    lastCompletedStep:
      (draft.lastCompletedStep as string | null | undefined) ?? null,
    data: (draft.data as Record<string, string> | undefined) ?? {},
  };
}

/**
 * Picks whichever of two steps comes later in the wizard, so going back
 * and re-saving an earlier step never rewinds the recorded progress.
 * @param {Purpose} purpose Which sign-up flow.
 * @param {string | null} a One step, or null for none.
 * @param {string | null} b Another step, or null for none.
 * @return {string | null} The later step, or null if neither is known.
 */
export function laterStep(
  purpose: Purpose,
  a: string | null,
  b: string | null,
): string | null {
  const order = DRAFT_STEP_ORDER[purpose];
  const index = Math.max(order.indexOf(a ?? ""), order.indexOf(b ?? ""));
  return index >= 0 ? order[index] : null;
}
