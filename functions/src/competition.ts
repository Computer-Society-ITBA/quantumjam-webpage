import {onCall, HttpsError} from "firebase-functions/https";
import {
  DocumentReference,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

import {resolveLang} from "./lib/i18n/index";

import {db} from "./admin";
import {
  GMAIL_APP_PASSWORD,
  sendCompetitionConfirmationEmail,
  type CompetitionConfirmationTeam,
} from "./lib/email";
import {
  canonicalEmail,
  isValidEmail,
  normalizeEmail,
  verificationId,
} from "./lib/otp";
import {assertRegistrationOpen} from "./lib/flags";
import {assertVerifiedSession, draftRef} from "./lib/drafts";
import {MAX_TEAM_SIZE, teamIdFrom} from "./lib/slug";
import { collections } from "./lib/collections";

type TeamChoice = "join" | "create" | "alone";

// DNI or passport, per the field's own copy: passports can contain letters.
const ID_RE = /^[a-zA-Z0-9]{5,20}$/;
const AGE_RE = /^\d{1,3}$/;
const GRAD_YEAR_RE = /^\d{4}$/;
// 1 to 60 characters: letters in any script, plus the spaces, hyphens,
// apostrophes and periods real names carry. Built from a string because
// the es2017 target rejects \p{...} in a regex literal.
const NAME_RE = new RegExp("^(?=.*\\p{L})[\\p{L}\\p{M}'’ .-]{1,60}$", "u");

/**
 * Asserts a value is a non-empty string, trimmed.
 * @param {unknown} value The value to check.
 * @param {string} field Field name used in the error message.
 * @return {string} The trimmed string.
 */
function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  return value.trim();
}

/**
 * Reads an optional string field, defaulting to "".
 * @param {unknown} value The value to check.
 * @return {string} The trimmed string, or "" if not a string.
 */
function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Asserts a required field matches a pattern (e.g. digits only).
 * @param {unknown} value The value to check.
 * @param {string} field Field name used in the error message.
 * @param {RegExp} pattern Pattern the trimmed value must match.
 * @return {string} The trimmed, validated string.
 */
function requirePattern(
  value: unknown,
  field: string,
  pattern: RegExp,
): string {
  const str = requireString(value, field);
  if (!pattern.test(str)) {
    throw new HttpsError("invalid-argument", `${field} is not valid.`);
  }
  return str;
}

/**
 * Reads an optional field, validating its format only if present.
 * @param {unknown} value The value to check.
 * @param {string} field Field name used in the error message.
 * @param {RegExp} pattern Pattern the trimmed value must match if non-empty.
 * @return {string} The trimmed string, or "" if not provided.
 */
function optionalPattern(
  value: unknown,
  field: string,
  pattern: RegExp,
): string {
  const str = optionalString(value);
  if (str && !pattern.test(str)) {
    throw new HttpsError("invalid-argument", `${field} is not valid.`);
  }
  return str;
}

type Fields = Record<string, unknown> | null | undefined;

/**
 * Validates the wizard's "personal" step.
 * @param {Fields} body Raw request fields.
 * @return {Record<string, string>} The validated, trimmed fields.
 */
export function parsePersonalFields(body: Fields) {
  return {
    firstName: requirePattern(body?.firstName, "firstName", NAME_RE),
    lastName: requirePattern(body?.lastName, "lastName", NAME_RE),
    dni: requirePattern(body?.dni, "dni", ID_RE),
    age: requirePattern(body?.age, "age", AGE_RE),
    university: requireString(body?.university, "university"),
    location: requireString(body?.location, "location"),
    major: optionalString(body?.major),
    gradYear: optionalPattern(body?.gradYear, "gradYear", GRAD_YEAR_RE),
    diet: optionalString(body?.diet),
  };
}

/**
 * Reads the wizard's "socials" step, where every field is optional.
 * @param {Fields} body Raw request fields.
 * @return {Record<string, string>} The trimmed fields.
 */
export function parseSocialFields(body: Fields) {
  return {
    github: optionalString(body?.github),
    linkedin: optionalString(body?.linkedin),
    x: optionalString(body?.x),
    instagram: optionalString(body?.instagram),
    website: optionalString(body?.website),
  };
}

/**
 * Reads the wizard's "team" step as chosen so far. Lenient on purpose:
 * it is autosaved while still being filled in, and nothing is reserved
 * until the final submit validates and claims the team.
 * @param {Fields} body Raw request fields.
 * @return {Record<string, string>} The trimmed fields.
 */
export function parseTeamDraftFields(body: Fields) {
  const teamChoice = optionalString(body?.teamChoice);
  if (teamChoice && !["join", "create", "alone"].includes(teamChoice)) {
    throw new HttpsError(
      "invalid-argument",
      "A valid team choice is required.",
    );
  }
  return {
    teamChoice,
    teamName: optionalString(body?.teamName),
    teamCode: optionalString(body?.teamCode),
  };
}

export const submitCompetitionSignup = onCall(
  {secrets: [GMAIL_APP_PASSWORD]},
  async (request) => {
    await assertRegistrationOpen("competition");

    const body = request.data as Record<string, unknown> | null;
    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }
    const verificationToken = requireString(
      body?.verificationToken,
      "verificationToken",
    );

    const {
      firstName,
      lastName,
      dni,
      age,
      university,
      location,
      major,
      gradYear,
      diet,
    } = parsePersonalFields(body);
    const {github, linkedin, x, instagram, website} = parseSocialFields(body);

    const team = body?.team as Record<string, unknown> | undefined;
    const rawChoice = team?.choice;
    const lang = resolveLang(
      typeof body?.lang === "string" ? body.lang : undefined,
    );
    if (
      rawChoice !== "join" &&
      rawChoice !== "create" &&
      rawChoice !== "alone"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A valid team choice is required.",
      );
    }
    const choice = rawChoice as TeamChoice;

    let teamSlug: string | null = null;
    let teamName: string | null = null;
    if (choice === "create") {
      teamName = requireString(team?.name, "team name");
      teamSlug = teamIdFrom(teamName);
      if (teamSlug.length < 3) {
        throw new HttpsError("invalid-argument", "Team name is too short.");
      }
    } else if (choice === "join") {
      const code = requireString(team?.code, "team code");
      teamSlug = teamIdFrom(code);
      if (teamSlug.length < 4) {
        throw new HttpsError("invalid-argument", "Team code is too short.");
      }
    }

    const verRef = db
      .collection(collections.emailVerifications)
      .doc(verificationId("competition", email));
    const signupRef = db
      .collection(collections.competitionSignups)
      .doc(canonicalEmail(email));
    const teamRef = teamSlug ? db.collection(collections.teams).doc(teamSlug) : null;

    await db.runTransaction(async (tx) => {
      const verSnap = await tx.get(verRef);
      const signupSnap = await tx.get(signupRef);
      const teamSnap = teamRef ? await tx.get(teamRef) : null;

      assertVerifiedSession(verSnap, verificationToken);
      if (signupSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "This email is already registered.",
        );
      }

      if (choice === "create" && teamSnap!.exists) {
        throw new HttpsError(
          "already-exists",
          "This team code is already taken.",
        );
      }
      if (choice === "join") {
        if (!teamSnap!.exists) {
          throw new HttpsError("not-found", "Team not found.");
        }
        const memberCount = (teamSnap!.data()!.memberCount as number) ?? 0;
        if (memberCount >= MAX_TEAM_SIZE) {
          throw new HttpsError(
            "resource-exhausted",
            "This team is already full.",
          );
        }
      }

      const now = Timestamp.now();

      if (choice === "create") {
        tx.create(teamRef!, {
          id: teamSlug,
          name: teamName,
          memberCount: 1,
          memberEmails: [email],
          createdAt: now,
          updatedAt: now,
        });
      } else if (choice === "join") {
        tx.update(teamRef!, {
          memberCount: FieldValue.increment(1),
          memberEmails: FieldValue.arrayUnion(email),
          updatedAt: now,
        });
      }

      tx.create(signupRef, {
        email,
        firstName,
        lastName,
        dni,
        age,
        university,
        major,
        gradYear,
        location,
        diet,
        github,
        linkedin,
        x,
        instagram,
        website,
        teamChoice: choice,
        teamId: teamSlug,
        status: "pending",
        createdAt: now,
        lang,
      });
      tx.update(verRef, {consumedAt: now});
      tx.delete(draftRef("competition", email));
    });

    // Best-effort: the signup itself already succeeded, so a confirmation
    // email failure shouldn't fail the request.
    try {
      const teamInfo = await loadTeamConfirmationInfo(
        choice,
        teamRef,
        teamName,
      );
      await sendCompetitionConfirmationEmail(email, teamInfo, lang);
    } catch (err) {
      logger.error("Failed to send competition confirmation email", {
        email,
        err,
      });
    }

    return {ok: true, teamId: teamSlug};
  },
);

/**
 * Builds the team info for the confirmation email, re-reading the team
 * doc so the member count reflects this signup's own join/create.
 * @param {TeamChoice} choice The signer's team choice.
 * @param {DocumentReference | null} teamRef The team doc reference, or
 *   null for "alone".
 * @param {string | null} teamName The team name, known already for
 *   "create" without a re-read.
 * @return {Promise<CompetitionConfirmationTeam>} Team info to email.
 */
async function loadTeamConfirmationInfo(
  choice: TeamChoice,
  teamRef: DocumentReference | null,
  teamName: string | null,
): Promise<CompetitionConfirmationTeam> {
  if (choice === "alone" || !teamRef) {
    return {choice: "alone"};
  }
  const snap = await teamRef.get();
  const data = snap.data();
  return {
    choice,
    name: (data?.name as string | undefined) ?? teamName ?? "",
    code: teamRef.id,
    memberCount: (data?.memberCount as number | undefined) ?? 1,
  };
}

export const lookupTeam = onCall(async (request) => {
  const body = request.data as Record<string, unknown> | null;
  const rawCode = typeof body?.code === "string" ? body.code : "";
  const slug = teamIdFrom(rawCode);
  if (slug.length < 4) {
    return {exists: false, memberCount: 0, isFull: false};
  }

  const snap = await db.collection(collections.teams).doc(slug).get();
  if (!snap.exists) {
    return {exists: false, memberCount: 0, isFull: false};
  }
  const memberCount = (snap.data()!.memberCount as number) ?? 0;
  return {exists: true, memberCount, isFull: memberCount >= MAX_TEAM_SIZE};
});
