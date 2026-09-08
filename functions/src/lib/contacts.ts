import {FieldValue, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

import {db} from "../admin";
import {canonicalEmail, type Purpose} from "./otp";

export const EMAIL_CONTACTS_COLLECTION = "emailContacts";

export type ContactStatus = "unverified" | "verified";

/**
 * Upserts a contact row, only ever moving its status forward. Creating
 * the row stamps firstSeenAt; later writes leave it alone.
 * @param {string} email The normalized email as typed.
 * @param {Purpose} purpose Which flow the address came from.
 * @param {ContactStatus} status The status this call establishes.
 * @return {Promise<void>} Resolves once the row is written.
 */
async function upsertContact(
  email: string,
  purpose: Purpose,
  status: ContactStatus,
): Promise<void> {
  const ref = db
    .collection(EMAIL_CONTACTS_COLLECTION)
    .doc(canonicalEmail(email));

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Timestamp.now();

    if (!snap.exists) {
      tx.create(ref, {
        email,
        canonicalEmail: canonicalEmail(email),
        status,
        purposes: [purpose],
        firstSeenAt: now,
        updatedAt: now,
        verifiedAt: status === "verified" ? now : null,
      });
      return;
    }

    // Verification only moves forward: re-entering an address that was
    // already confirmed must not send it back to "unverified".
    const wasVerified = snap.data()?.status === "verified";
    const next: Record<string, unknown> = {
      email,
      purposes: FieldValue.arrayUnion(purpose),
      updatedAt: now,
    };
    if (status === "verified" && !wasVerified) {
      next.status = "verified";
      next.verifiedAt = now;
    }
    tx.update(ref, next);
  });
}

/**
 * Records an email the moment it is entered, before the rest of the
 * sign-up exists. This is the outreach list, kept separate from
 * workshopSignups/competitionSignups: an address lands here even if the
 * person never finishes, or never even verifies, a sign-up.
 *
 * Best-effort. Losing a contact row must never fail the sign-up the
 * visitor is actually trying to complete.
 * @param {string} email The normalized email as typed.
 * @param {Purpose} purpose Which flow the address came from.
 * @return {Promise<void>} Always resolves.
 */
export async function recordEmailContact(
  email: string,
  purpose: Purpose,
): Promise<void> {
  try {
    await upsertContact(email, purpose, "unverified");
  } catch (err) {
    logger.error("Failed to record email contact", {email, purpose, err});
  }
}

/**
 * Flips a contact to "verified" once its code has been confirmed, and
 * creates the row if the write at request time was lost, so a verified
 * address is never missing from the list.
 *
 * Best-effort, for the same reason as recordEmailContact.
 * @param {string} email The normalized email as typed.
 * @param {Purpose} purpose Which flow the address came from.
 * @return {Promise<void>} Always resolves.
 */
export async function markEmailContactVerified(
  email: string,
  purpose: Purpose,
): Promise<void> {
  try {
    await upsertContact(email, purpose, "verified");
  } catch (err) {
    logger.error("Failed to mark email contact verified", {
      email,
      purpose,
      err,
    });
  }
}
