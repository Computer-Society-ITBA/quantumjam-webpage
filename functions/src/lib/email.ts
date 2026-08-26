import nodemailer from "nodemailer";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

export const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const FROM_EMAIL = "computersociety@itba.edu.ar";

let transporter: nodemailer.Transporter | null = null;

/**
 * Lazily builds the Gmail SMTP transport with the app password secret.
 * @return {nodemailer.Transporter} The shared SMTP transport.
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: FROM_EMAIL,
        pass: GMAIL_APP_PASSWORD.value(),
      },
    });
  }
  return transporter;
}

/**
 * Sends a verification code to an email via Gmail SMTP.
 * @param {string} email Recipient address.
 * @param {string} code The plaintext code to include in the email.
 * @return {Promise<void>} Resolves once the SMTP server accepts the send.
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    // No real Gmail credentials in local dev — log the code instead of
    // emailing it, so the flow is testable against the emulator suite.
    logger.info(`[emulator] Verification code for ${email}: ${code}`);
    return;
  }

  try {
    await getTransporter().sendMail({
      from: `QuantumJam <${FROM_EMAIL}>`,
      to: email,
      subject: "Your QuantumJam verification code",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html:
        `<p>Your verification code is <strong>${code}</strong>.</p>` +
        "<p>It expires in 10 minutes.</p>",
    });
  } catch (err) {
    logger.error("Failed to send verification email", {email, err});
    throw err;
  }
}
