import QRCode from "qrcode";
import {FieldValue, type DocumentData} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

import {db} from "./admin";
import {collections} from "./lib/collections";
import {
  VENUE_ADDRESS,
  sendCompetitionQrEmail,
  type Teammate,
} from "./lib/competitionQrEmail";
import {
  ACCEPTED_STATUS,
  competitionQrBlock,
  surelyNotSent,
  type CompetitionQrBlock,
} from "./competitionQrPolicy";
import {makeCompetitionToken, parseCompetitionToken} from "./tickets";

export type CheckInResult =
  | {result: "ok"; label: string}
  | {result: "already"; label: string; checkedInAt: string}
  | {result: "notAccepted"; label: string}
  | {result: "invalid"};

/**
 * Builds a display name from a competition signup.
 * @param {DocumentData} data A competition signup.
 * @return {string} The person's full name.
 */
function fullName(data: DocumentData): string {
  return (
    data.name ?? [data.firstName, data.lastName].filter(Boolean).join(" ")
  );
}

/**
 * Renders a QR as a PNG, dark on white so it stays scannable.
 * @param {string} text What the QR encodes.
 * @return {Promise<Buffer>} The PNG bytes.
 */
function qrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    width: 480,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

/**
 * Checks someone in to the competition by stamping their signup.
 * @param {string} secret The QR signing secret.
 * @param {string} token The scanned text.
 * @return {Promise<CheckInResult>} The outcome to show at the door.
 */
async function checkInCompetition(
  secret: string,
  token: string,
): Promise<CheckInResult> {
  const parsed = parseCompetitionToken(secret, token);
  if (!parsed) return {result: "invalid"};

  const ref = db.collection(collections.competitionSignups).doc(parsed.id);
  return db.runTransaction<CheckInResult>(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return {result: "invalid"};

    const data = snap.data() ?? {};
    const label = fullName(data);
    // Someone who dropped out (their status moved off accepted) keeps a
    // validly signed QR, so the status is checked again at the door.
    if (data.status !== ACCEPTED_STATUS) {
      return {result: "notAccepted", label};
    }
    if (data.competitionCheckedInAt) {
      return {
        result: "already",
        label,
        checkedInAt: data.competitionCheckedInAt,
      };
    }
    tx.update(ref, {competitionCheckedInAt: new Date().toISOString()});
    return {result: "ok", label};
  });
}

/**
 * Checks someone in to the competition from a scanned QR.
 * @param {string} secret The QR signing secret.
 * @param {string} token The scanned text.
 * @return {Promise<CheckInResult>} The outcome to show at the door.
 */
export async function checkInByToken(
  secret: string,
  token: string,
): Promise<CheckInResult> {
  return checkInCompetition(secret, token);
}

/**
 * Builds the team block of the competition QR email: the team's name and
 * the other approved members, so nobody is introduced to a teammate who
 * was not accepted.
 * @param {string} selfId The recipient's signup ID, left out of the list.
 * @param {string} teamId The team the recipient belongs to.
 * @return {Promise<{teamName: string, teammates: Teammate[]}>} The block.
 */
async function loadTeam(
  selfId: string,
  teamId: string,
): Promise<{teamName: string; teammates: Teammate[]}> {
  const [team, members] = await Promise.all([
    db.collection(collections.teams).doc(teamId).get(),
    db.collection(collections.competitionSignups)
      .where("teamId", "==", teamId)
      .get(),
  ]);
  const teammates = members.docs
    .filter((doc) =>
      doc.id !== selfId && doc.get("status") === ACCEPTED_STATUS)
    .map((doc) => ({name: fullName(doc.data()), email: doc.get("email")}))
    .filter((m) => typeof m.email === "string" && m.email !== "")
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const name = team.get("name");
  return {
    teamName: typeof name === "string" && name.trim() ? name : teamId,
    teammates,
  };
}

export type CompetitionQrResult =
  | {result: "sent"}
  | {result: "notFound"}
  | {result: "notConfigured"}
  | {result: CompetitionQrBlock};

/**
 * Emails an approved competition registrant their competition QR, at most
 * once unless an admin explicitly resends it.
 *
 * The signup is claimed in a transaction before anything is sent, so two
 * admins (or a bulk run and a click) can never both send it. The claim is
 * only released when the send surely failed; if the outcome is unknown it
 * stays, and the signup is skipped until an admin resends it on purpose.
 * @param {string} secret The QR signing secret.
 * @param {string} id The competition signup document ID.
 * @param {boolean} resend Send again even if it was sent before.
 * @return {Promise<CompetitionQrResult>} What happened.
 */
export async function sendCompetitionQr(
  secret: string,
  id: string,
  resend = false,
): Promise<CompetitionQrResult> {
  if (!VENUE_ADDRESS) return {result: "notConfigured"};

  const ref = db.collection(collections.competitionSignups).doc(id);
  const claimedAt = new Date().toISOString();
  const claim = await db.runTransaction<
    {block: CompetitionQrResult} | {data: DocumentData}
  >(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return {block: {result: "notFound"}};
    const data = snap.data() ?? {};
    const block = competitionQrBlock(data, resend);
    if (block) return {block: {result: block}};
    tx.update(ref, {competitionQrClaimedAt: claimedAt});
    return {data};
  });
  if ("block" in claim) return claim.block;
  const data = claim.data;

  // Only releases this run's own claim, never one a later resend made.
  const release = () => db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.get("competitionQrClaimedAt") === claimedAt) {
      tx.update(ref, {competitionQrClaimedAt: FieldValue.delete()});
    }
  });

  let team: {teamName: string; teammates: Teammate[]};
  let png: Buffer;
  try {
    team = await loadTeam(id, data.teamId);
    png = await qrPng(makeCompetitionToken(secret, id));
  } catch (err) {
    await release();
    throw err;
  }

  try {
    await sendCompetitionQrEmail(data.email, png, {
      firstName: String(data.firstName ?? ""),
      teamName: team.teamName,
      teammates: team.teammates,
      lang: data.lang === "en" ? "en" : "es",
    });
  } catch (err) {
    if (surelyNotSent(err)) await release();
    throw err;
  }

  // The email is out. If recording that fails, the claim still blocks a
  // second automatic send.
  try {
    await ref.update({
      competitionQrSentAt: new Date().toISOString(),
      competitionQrClaimedAt: FieldValue.delete(),
    });
  } catch (err) {
    logger.error("Competition QR sent but not recorded", {id, err});
  }
  return {result: "sent"};
}
