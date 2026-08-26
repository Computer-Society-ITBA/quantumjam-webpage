import {onCall, HttpsError} from "firebase-functions/https";
import {FieldValue, Timestamp} from "firebase-admin/firestore";

import {db} from "./admin";
import {isValidEmail, normalizeEmail, verificationId} from "./lib/otp";
import {MAX_TEAM_SIZE, teamIdFrom} from "./lib/slug";

type TeamChoice = "join" | "create" | "alone";

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

export const submitCompetitionSignup = onCall(async (request) => {
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

  const dni = requireString(body?.dni, "dni");
  const age = requireString(body?.age, "age");
  const university = requireString(body?.university, "university");
  const location = requireString(body?.location, "location");
  const major = optionalString(body?.major);
  const gradYear = optionalString(body?.gradYear);
  const diet = optionalString(body?.diet);
  const github = optionalString(body?.github);
  const linkedin = optionalString(body?.linkedin);
  const x = optionalString(body?.x);
  const instagram = optionalString(body?.instagram);
  const website = optionalString(body?.website);

  const team = body?.team as Record<string, unknown> | undefined;
  const rawChoice = team?.choice;
  if (rawChoice !== "join" && rawChoice !== "create" && rawChoice !== "alone") {
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
    .collection("emailVerifications")
    .doc(verificationId("competition", email));
  const signupRef = db.collection("competitionSignups").doc(email);
  const teamRef = teamSlug ? db.collection("teams").doc(teamSlug) : null;

  await db.runTransaction(async (tx) => {
    const verSnap = await tx.get(verRef);
    const signupSnap = await tx.get(signupRef);
    const teamSnap = teamRef ? await tx.get(teamRef) : null;

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
    });
    tx.update(verRef, {consumedAt: now});
  });

  return {ok: true, teamId: teamSlug};
});

export const lookupTeam = onCall(async (request) => {
  const body = request.data as Record<string, unknown> | null;
  const rawCode = typeof body?.code === "string" ? body.code : "";
  const slug = teamIdFrom(rawCode);
  if (slug.length < 4) {
    return {exists: false, memberCount: 0, isFull: false};
  }

  const snap = await db.collection("teams").doc(slug).get();
  if (!snap.exists) {
    return {exists: false, memberCount: 0, isFull: false};
  }
  const memberCount = (snap.data()!.memberCount as number) ?? 0;
  return {exists: true, memberCount, isFull: memberCount >= MAX_TEAM_SIZE};
});
