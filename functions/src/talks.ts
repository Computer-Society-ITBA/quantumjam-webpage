import QRCode from "qrcode";
import type {DocumentData} from "firebase-admin/firestore";

import {db} from "./admin";
import {collections} from "./lib/collections";
import {sendTicketQrEmail} from "./lib/email";
import {
  REGISTRATION_COLLECTION,
  makeCompetitionToken,
  makeToken,
  parseCompetitionToken,
  parseToken,
  tokenEvent,
  type CheckInEvent,
  type RegistrationRoute,
} from "./tickets";

export const ATTENDEES_COLLECTION = collections.talkAttendees;

export type {CheckInEvent};

export type CheckInResult =
  | {result: "ok"; label: string; event: CheckInEvent}
  | {
      result: "already";
      label: string;
      checkedInAt: string;
      event: CheckInEvent;
    }
  | {result: "wrongEvent"}
  | {result: "invalid"};

/**
 * Builds a display name from either registration shape.
 * @param {DocumentData} data A workshop or competition signup.
 * @return {string} The person's full name.
 */
function fullName(data: DocumentData): string {
  return (
    data.name ?? [data.firstName, data.lastName].filter(Boolean).join(" ")
  );
}

/**
 * Drops empty values, since Firestore rejects undefined.
 * @param {Record<string, unknown>} obj The object to clean.
 * @return {Record<string, unknown>} A copy without null/empty entries.
 */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null && v !== ""),
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
 * Checks someone in to the talks. The attendee document ID is derived from
 * the registration, so scanning twice can never create two.
 * @param {string} secret The QR signing secret.
 * @param {string} token The scanned text.
 * @return {Promise<CheckInResult>} The outcome to show at the door.
 */
async function checkInTalks(
  secret: string,
  token: string,
): Promise<CheckInResult> {
  const parsed = parseToken(secret, token);
  if (!parsed) return {result: "invalid"};

  const collection = REGISTRATION_COLLECTION[parsed.route];
  const registration = db.collection(collection).doc(parsed.id);
  const attendee = db
    .collection(ATTENDEES_COLLECTION)
    .doc(`${parsed.route}_${parsed.id}`);

  return db.runTransaction<CheckInResult>(async (tx) => {
    const [reg, att] = await Promise.all([
      tx.get(registration),
      tx.get(attendee),
    ]);
    if (!reg.exists) return {result: "invalid"};

    const data = reg.data() ?? {};
    const label = fullName(data);
    if (att.exists) {
      return {
        result: "already",
        label,
        checkedInAt: att.get("checkedInAt"),
        event: "talks",
      };
    }

    tx.create(attendee, compact({
      name: label,
      age: data.age,
      university: data.university,
      email: data.email,
      source: parsed.route,
      registrationId: `${collection}/${parsed.id}`,
      checkedInAt: new Date().toISOString(),
    }));
    return {result: "ok", label, event: "talks"};
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
    if (data.competitionCheckedInAt) {
      return {
        result: "already",
        label,
        checkedInAt: data.competitionCheckedInAt,
        event: "competition",
      };
    }
    tx.update(ref, {competitionCheckedInAt: new Date().toISOString()});
    return {result: "ok", label, event: "competition"};
  });
}

/**
 * Checks someone in from a scanned QR, for the event the scanner is set to.
 * A QR for the other event is refused without recording anything.
 * @param {string} secret The QR signing secret.
 * @param {string} token The scanned text.
 * @param {CheckInEvent} event Which event the scanner is checking in for.
 * @return {Promise<CheckInResult>} The outcome to show at the door.
 */
export async function checkInByToken(
  secret: string,
  token: string,
  event: CheckInEvent,
): Promise<CheckInResult> {
  const kind = tokenEvent(token);
  if (!kind) return {result: "invalid"};
  if (kind !== event) return {result: "wrongEvent"};
  return event === "talks" ?
    checkInTalks(secret, token) :
    checkInCompetition(secret, token);
}

/**
 * Registers someone on the spot (talks only).
 * @param {unknown} body The parsed JSON request body.
 * @return {Promise<CheckInResult>} ok, or invalid if a field is bad.
 */
export async function registerWalkIn(body: unknown): Promise<CheckInResult> {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? "").trim();
  const university = String(b.university ?? "").trim();
  const age = Number(b.age);

  const valid =
    name.length > 0 && name.length <= 120 &&
    university.length > 0 && university.length <= 120 &&
    Number.isInteger(age) && age >= 10 && age <= 120;
  if (!valid) return {result: "invalid"};

  await db.collection(ATTENDEES_COLLECTION).add({
    name,
    age,
    university,
    source: "walk-in",
    checkedInAt: new Date().toISOString(),
  });
  return {result: "ok", label: name, event: "talks"};
}

/**
 * Emails a registrant their talks QR and records when it was sent.
 * @param {string} secret The QR signing secret.
 * @param {RegistrationRoute} route workshops or competition.
 * @param {string} id The registration document ID.
 * @return {Promise<boolean>} false if the registration does not exist.
 */
export async function sendRegistrationQr(
  secret: string,
  route: RegistrationRoute,
  id: string,
): Promise<boolean> {
  const ref = db.collection(REGISTRATION_COLLECTION[route]).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data() ?? {};

  const png = await qrPng(makeToken(secret, route, id));
  await sendTicketQrEmail(data.email, png, data.lang === "en" ? "en" : "es");
  await ref.update({qrSentAt: new Date().toISOString()});
  return true;
}

/**
 * Emails a competition registrant their competition QR and records when it
 * was sent (separately from the talks QR).
 * @param {string} secret The QR signing secret.
 * @param {string} id The competition signup document ID.
 * @return {Promise<boolean>} false if the signup does not exist.
 */
export async function sendCompetitionQr(
  secret: string,
  id: string,
): Promise<boolean> {
  const ref = db.collection(collections.competitionSignups).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data() ?? {};

  const png = await qrPng(makeCompetitionToken(secret, id));
  await sendTicketQrEmail(
    data.email,
    png,
    data.lang === "en" ? "en" : "es",
    "competition",
  );
  await ref.update({competitionQrSentAt: new Date().toISOString()});
  return true;
}