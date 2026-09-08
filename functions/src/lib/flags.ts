import {HttpsError} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

import {db} from "../admin";
import type {Purpose} from "./otp";

export const FEATURE_FLAGS_COLLECTION = "featureFlags";
export const REGISTRATION_FLAGS_DOC = "registration";

const FLAG_KEY: Record<Purpose, string> = {
  workshops: "workshopsRegistrationOpen",
  competition: "competitionRegistrationOpen",
};

/**
 * Reads whether a sign-up flow is open. Mirrors the client-side default
 * in src/lib/featureFlags.ts: only an explicit `true` opens a flow, so a
 * missing document, a missing field or a failed read all keep it closed.
 * Fail closed - accepting sign-ups for an event that is meant to be shut
 * is worse than turning away a few while Firestore is unreachable.
 * @param {Purpose} purpose Which sign-up flow.
 * @return {Promise<boolean>} Whether that flow accepts sign-ups.
 */
export async function isRegistrationOpen(purpose: Purpose): Promise<boolean> {
  try {
    const snap = await db
      .collection(FEATURE_FLAGS_COLLECTION)
      .doc(REGISTRATION_FLAGS_DOC)
      .get();
    return snap.data()?.[FLAG_KEY[purpose]] === true;
  } catch (err) {
    logger.error("Failed to read registration feature flags", {purpose, err});
    return false;
  }
}

/**
 * Rejects the request when the flow's feature flag is off. The UI already
 * hides the closed flow; this is the check that actually enforces it.
 * @param {Purpose} purpose Which sign-up flow.
 * @return {Promise<void>} Resolves when the flow is open.
 */
export async function assertRegistrationOpen(purpose: Purpose): Promise<void> {
  if (!(await isRegistrationOpen(purpose))) {
    throw new HttpsError(
      "failed-precondition",
      "Registration for this event is closed.",
    );
  }
}
