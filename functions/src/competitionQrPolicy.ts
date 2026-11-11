// Pure rules for who may receive the competition QR, kept apart from
// Firestore and SMTP so they can be unit tested.

export const ACCEPTED_STATUS = "accepted";

export type CompetitionQrBlock =
  | "notApproved"
  | "noTeam"
  | "alreadySent"
  | "inProgress";

/**
 * Decides whether a competition signup may be sent its QR right now.
 * Only an exact "accepted" status passes, so a missing, misspelled or
 * pending status never gets an email.
 *
 * Without resend, a signup that was already sent, or whose send was
 * claimed and never confirmed, is skipped: a send that may have gone out
 * is never repeated automatically. A resend is an explicit admin action
 * and skips only those two checks.
 * @param {Record<string, unknown>} data The signup document.
 * @param {boolean} resend Whether an admin asked to send it again.
 * @return {CompetitionQrBlock | null} Why it is blocked, or null if the
 *   send may go ahead.
 */
export function competitionQrBlock(
  data: Record<string, unknown>,
  resend: boolean,
): CompetitionQrBlock | null {
  if (data.status !== ACCEPTED_STATUS) return "notApproved";
  if (typeof data.teamId !== "string" || data.teamId.trim() === "") {
    return "noTeam";
  }
  if (resend) return null;
  if (data.competitionQrSentAt) return "alreadySent";
  if (data.competitionQrClaimedAt) return "inProgress";
  return null;
}

/**
 * Tells whether a failed send certainly did not deliver the email, so its
 * claim can be released and the send retried. Only an explicit SMTP
 * rejection or a failure to resolve, secure or log in qualifies: a timeout or a
 * dropped connection mid-send may still have delivered it, so its claim
 * stays and an admin decides whether to resend.
 * @param {unknown} err The error the send threw.
 * @return {boolean} Whether the email surely was not sent.
 */
export function surelyNotSent(err: unknown): boolean {
  const e = (err ?? {}) as {responseCode?: unknown; code?: unknown};
  if (typeof e.responseCode === "number" && e.responseCode >= 400) {
    return true;
  }
  // ECONNECTION is left out on purpose: nodemailer also uses it for a
  // connection that drops after the message was handed over.
  return e.code === "EAUTH" || e.code === "EDNS" || e.code === "ETLS";
}
