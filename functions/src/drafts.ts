import {onCall, HttpsError} from "firebase-functions/https";
import {Timestamp} from "firebase-admin/firestore";

import {db} from "./admin";
import {
  parsePersonalFields,
  parseSocialFields,
  parseTeamDraftFields,
} from "./competition";
import {
  DRAFT_STEP_ORDER,
  assertVerifiedSession,
  draftRef,
  laterStep,
  signupCollection,
} from "./lib/drafts";
import {assertRegistrationOpen} from "./lib/flags";
import {
  canonicalEmail,
  isValidEmail,
  normalizeEmail,
  verificationId,
  type Purpose,
} from "./lib/otp";
import {LEVELS} from "./workshops";

type Fields = Record<string, unknown> | null | undefined;

/**
 * Reads the workshops details as typed so far. Nothing is required: the
 * form autosaves while it is still being filled in, and the final submit
 * is what enforces the required fields.
 * @param {Fields} data Raw step fields.
 * @return {Record<string, string>} The trimmed fields.
 */
function parseWorkshopDetails(data: Fields): Record<string, string> {
  const text = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const level = text(data?.level);
  if (level && !(LEVELS as readonly string[]).includes(level)) {
    throw new HttpsError("invalid-argument", "A valid level is required.");
  }
  return {
    name: text(data?.name),
    career: text(data?.career),
    level,
    reason: text(data?.reason),
  };
}

const STEP_PARSERS: Record<
  Purpose,
  Record<string, (data: Fields) => Record<string, string>>
> = {
  workshops: {details: parseWorkshopDetails},
  competition: {
    personal: parsePersonalFields,
    socials: parseSocialFields,
    team: parseTeamDraftFields,
  },
};

export const saveSignupDraft = onCall(async (request) => {
  const body = request.data as Record<string, unknown> | null;
  const purpose = body?.purpose as Purpose;
  if (purpose !== "workshops" && purpose !== "competition") {
    throw new HttpsError("invalid-argument", "A valid purpose is required.");
  }
  await assertRegistrationOpen(purpose);

  const email =
    typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }
  const verificationToken =
    typeof body?.verificationToken === "string" ? body.verificationToken : "";
  const step = typeof body?.step === "string" ? body.step : "";
  const parsers = STEP_PARSERS[purpose];
  const parse = Object.keys(parsers).includes(step) ? parsers[step] : null;
  if (!parse) {
    throw new HttpsError("invalid-argument", "A valid step is required.");
  }
  const fields = parse(body?.data as Fields);

  const verRef = db
    .collection("emailVerifications")
    .doc(verificationId(purpose, email));
  const signupRef = db
    .collection(signupCollection(purpose))
    .doc(canonicalEmail(email));
  const ref = draftRef(purpose, email);

  await db.runTransaction(async (tx) => {
    const verSnap = await tx.get(verRef);
    const signupSnap = await tx.get(signupRef);
    const draftSnap = await tx.get(ref);

    assertVerifiedSession(verSnap, verificationToken);
    // A finished sign-up is final: it can't be reopened as a draft.
    if (signupSnap.exists) {
      throw new HttpsError(
        "already-exists",
        "This email is already registered.",
      );
    }

    const now = Timestamp.now();
    const prev = draftSnap.data();
    const completed = DRAFT_STEP_ORDER[purpose].includes(step) ? step : null;
    tx.set(ref, {
      email,
      purpose,
      data: {...(prev?.data as Record<string, string> | undefined), ...fields},
      lastCompletedStep: laterStep(
        purpose,
        (prev?.lastCompletedStep as string | null | undefined) ?? null,
        completed,
      ),
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
    });
  });

  return {ok: true};
});
