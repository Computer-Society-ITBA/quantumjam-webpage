import * as fs from "fs";
import * as path from "path";
import nodemailer from "nodemailer";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

import {MAX_TEAM_SIZE} from "./slug";

export const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const FROM_EMAIL = "computersociety@itba.edu.ar";

const LOGO_CID = "csitba-logo";
// functions/assets/logo.png, relative to this compiled file at
// functions/lib/lib/email.js — kept outside src/ since tsc only emits
// compiled .ts output into lib/, it doesn't copy other file types.
const LOGO_PATH = path.join(__dirname, "..", "..", "assets", "logo.png");
const LOGO_WIDTH = 160;
const LOGO_HEIGHT = 66;

const COLOR = {
  bg: "#121212",
  panel: "#161616",
  line: "#262626",
  text: "#f4f4f4",
  textDim: "#a8a8a8",
  green: "#b4ff39",
};

const FONT_SANS = "Arial,Helvetica,sans-serif";
const FONT_DISPLAY = "'Archivo',Arial,sans-serif";
const FONT_MONO = "'Courier New',Courier,monospace";

const STYLE = {
  body: `margin:0;padding:0;background:${COLOR.bg};`,
  eyebrow: "text-align:center;margin:0 0 28px;",
  panel:
    `background:${COLOR.panel};border:1px solid ${COLOR.line};` +
    "padding:36px 32px;",
  wordmark:
    `margin:0 0 24px;font-family:${FONT_DISPLAY};font-weight:800;` +
    "font-size:24px;letter-spacing:0.02em;text-transform:uppercase;" +
    `color:${COLOR.green};`,
  footer:
    "text-align:center;margin:24px 0 0;font-size:12px;" +
    `line-height:1.6;color:${COLOR.textDim};`,
  bodyText:
    "margin:0 0 16px;font-size:15px;line-height:1.6;" +
    `color:${COLOR.text};`,
  dimText: `margin:0;font-size:14px;line-height:1.6;color:${COLOR.textDim};`,
  label:
    "margin:0 0 4px;font-size:14px;line-height:1.6;" +
    `color:${COLOR.textDim};`,
  codeBox:
    "margin:20px 0;padding:20px 0;text-align:center;" +
    `border-top:1px solid ${COLOR.line};` +
    `border-bottom:1px solid ${COLOR.line};`,
  code:
    `font-family:${FONT_MONO};font-size:38px;font-weight:700;` +
    `letter-spacing:0.35em;color:${COLOR.green};`,
  fine: `margin:0;font-size:13px;line-height:1.6;color:${COLOR.textDim};`,
  infoBox:
    `margin-top:20px;padding:16px 18px;background:${COLOR.bg};` +
    `border:1px solid ${COLOR.line};`,
  infoLabel:
    `margin:0 0 8px;font-family:${FONT_DISPLAY};font-weight:700;` +
    "font-size:11px;letter-spacing:0.08em;text-transform:uppercase;" +
    `color:${COLOR.textDim};`,
  teamName: `margin:0 0 4px;font-size:15px;color:${COLOR.text};`,
  teamCode:
    `margin:0 0 8px;font-family:${FONT_MONO};font-size:16px;` +
    `letter-spacing:0.05em;color:${COLOR.green};`,
  teamMeta: `margin:0;font-size:13px;color:${COLOR.textDim};`,
  ctaButton:
    "display:inline-block;margin-top:16px;padding:12px 28px;" +
    `border:2px solid ${COLOR.green};color:${COLOR.green};` +
    `font-family:${FONT_DISPLAY};font-weight:700;font-size:13px;` +
    "letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;",
};

// TODO: swap for the real invite once the Discord server is set up —
// this is mocked so the confirmation email is fully wired end to end.
const DISCORD_INVITE_URL = "https://discord.gg/quantumjam";

let transporter: nodemailer.Transporter | null = null;
let logoBuffer: Buffer | null = null;

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
 * Lazily reads the Computer Society ITBA logo, cached for the lifetime
 * of the function instance.
 * @return {Buffer} The logo PNG bytes.
 */
function getLogoBuffer(): Buffer {
  if (!logoBuffer) {
    logoBuffer = fs.readFileSync(LOGO_PATH);
  }
  return logoBuffer;
}

/**
 * Escapes text so it's safe to inline into the HTML email body — team
 * names are free-form user input.
 * @param {string} value Raw text.
 * @return {string} HTML-escaped text.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wraps email body HTML in the shared QNTMJAM-branded shell (dark
 * panel, Archivo display font, brand-green accent) matching the site.
 *
 * Built as nested tables with explicit `bgcolor` attributes rather than
 * a plain `<body>`/`<div>` background — mobile Gmail's auto dark-mode
 * otherwise ignores CSS-only backgrounds and re-renders the email in
 * its own light theme.
 * @param {string} bodyHtml Inner content HTML.
 * @return {string} The full HTML document.
 */
function renderEmailShell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
  </head>
  <body style="${STYLE.body}" bgcolor="${COLOR.bg}">
    <table role="presentation" width="100%" cellpadding="0"
      cellspacing="0" border="0" bgcolor="${COLOR.bg}"
      style="background-color:${COLOR.bg};">
      <tr>
        <td align="center" style="padding:48px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0"
            border="0"
            style="width:100%;max-width:520px;font-family:${FONT_SANS};">
            <tr>
              <td>
                <p style="${STYLE.eyebrow}">
                  <img src="cid:${LOGO_CID}" width="${LOGO_WIDTH}"
                    height="${LOGO_HEIGHT}" alt="Computer Society ITBA"
                    style="display:inline-block;border:0;">
                </p>
                <table role="presentation" width="100%" cellpadding="0"
                  cellspacing="0" border="0" bgcolor="${COLOR.panel}"
                  style="background-color:${COLOR.panel};
                    border:1px solid ${COLOR.line};">
                  <tr>
                    <td style="padding:36px 32px;">
                      <p style="${STYLE.wordmark}">QNTMJAM</p>
                      ${bodyHtml}
                    </td>
                  </tr>
                </table>
                <p style="${STYLE.footer}">
                  Computer Society ITBA, San Mart&iacute;n 202, CABA
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends an email via Gmail SMTP, or logs it locally under the
 * Functions emulator instead of sending for real.
 * @param {string} to Recipient address.
 * @param {string} subject Email subject line.
 * @param {string} text Plain-text body.
 * @param {string} html HTML body.
 * @return {Promise<void>} Resolves once the SMTP server accepts the send.
 */
async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
): Promise<void> {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    logger.info(`[emulator] Email to ${to}: ${subject}\n${text}`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from: `QNTMJAM <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: "logo.png",
          content: getLogoBuffer(),
          cid: LOGO_CID,
        },
      ],
    });
  } catch (err) {
    logger.error("Failed to send email", {to, subject, err});
    throw err;
  }
}

/**
 * Sends a verification code to an email via Gmail SMTP.
 * @param {string} email Recipient address.
 * @param {string} code The plaintext code to include in the email.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  const html = renderEmailShell(`
    <p style="${STYLE.label}">
      Tu c&oacute;digo de verificaci&oacute;n
    </p>
    <div style="${STYLE.codeBox}">
      <span style="${STYLE.code}">${code}</span>
    </div>
    <p style="${STYLE.fine}">
      Expira en 10 minutos. Si no lo pediste vos, ignor&aacute; este
      mensaje.
    </p>
  `);
  const text =
    `Tu código de verificación es ${code}. Expira en 10 minutos.\n` +
    "Si no lo pediste vos, ignorá este mensaje.";
  await sendEmail(email, "QNTMJAM: Tu código de verificación", text, html);
}

/**
 * Sends the post-registration confirmation email for the workshops flow.
 * @param {string} email Recipient address.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendWorkshopConfirmationEmail(
  email: string,
): Promise<void> {
  const html = renderEmailShell(`
    <p style="${STYLE.bodyText}">
      &iexcl;Recibimos tu inscripci&oacute;n a los
      <strong>workshops y clases virtuales</strong>!
    </p>
    <p style="${STYLE.dimText}">
      Sumate a nuestro servidor de Discord: ah&iacute; vamos a compartir
      los links de las sesiones y todas las novedades.
    </p>
    <p style="text-align:center;margin:0;">
      <a href="${DISCORD_INVITE_URL}" style="${STYLE.ctaButton}">
        Unirme al Discord
      </a>
    </p>
  `);
  const text =
    "Recibimos tu inscripción a los workshops y clases virtuales.\n" +
    "Sumate a nuestro servidor de Discord: ahí vamos a compartir los " +
    `links de las sesiones y todas las novedades.\n${DISCORD_INVITE_URL}`;
  await sendEmail(
    email,
    "QNTMJAM: Recibimos tu inscripción a los workshops",
    text,
    html,
  );
}

export type CompetitionConfirmationTeam =
  | {choice: "alone"}
  | {
      choice: "create" | "join";
      name: string;
      code: string;
      memberCount: number;
    };

/**
 * Renders the team-status section of the competition confirmation email.
 * @param {CompetitionConfirmationTeam} team Team info to render.
 * @return {string} HTML for the team section.
 */
function renderTeamSection(team: CompetitionConfirmationTeam): string {
  if (team.choice === "alone") {
    return `
      <div style="${STYLE.infoBox}">
        <p style="${STYLE.teamMeta}">
          Te anotaste sin equipo. Si qued&aacute;s seleccionado, te
          asignamos a un equipo de hasta ${MAX_TEAM_SIZE} personas antes
          de la competencia.
        </p>
      </div>
    `;
  }
  return `
    <div style="${STYLE.infoBox}">
      <p style="${STYLE.infoLabel}">Tu equipo</p>
      <p style="${STYLE.teamName}">${escapeHtml(team.name)}</p>
      <p style="${STYLE.teamCode}">${escapeHtml(team.code)}</p>
      <p style="${STYLE.teamMeta}">
        ${team.memberCount} de ${MAX_TEAM_SIZE} integrantes
      </p>
    </div>
  `;
}

/**
 * Builds the plain-text team-status paragraph for the competition
 * confirmation email.
 * @param {CompetitionConfirmationTeam} team Team info to render.
 * @return {string} Plain-text team status.
 */
function renderTeamText(team: CompetitionConfirmationTeam): string {
  if (team.choice === "alone") {
    return (
      "Te anotaste sin equipo. Si quedás seleccionado, te asignamos a " +
      `un equipo de hasta ${MAX_TEAM_SIZE} personas antes de la ` +
      "competencia."
    );
  }
  return (
    `Tu equipo: ${team.name} (código: ${team.code}), ` +
    `${team.memberCount} de ${MAX_TEAM_SIZE} integrantes.`
  );
}

/**
 * Sends the post-registration confirmation email for the competition
 * flow, including team status (name, code, member count) when relevant.
 * @param {string} email Recipient address.
 * @param {CompetitionConfirmationTeam} team Team info to include.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendCompetitionConfirmationEmail(
  email: string,
  team: CompetitionConfirmationTeam,
): Promise<void> {
  const html = renderEmailShell(`
    <p style="${STYLE.bodyText}">
      &iexcl;Recibimos tu inscripci&oacute;n a la
      <strong>competencia de computaci&oacute;n cu&aacute;ntica</strong>!
    </p>
    <p style="${STYLE.dimText}">
      Revisamos cada postulaci&oacute;n y te avisamos tu estado por mail
      antes del 14 de noviembre.
    </p>
    ${renderTeamSection(team)}
  `);
  const text =
    "Recibimos tu inscripción a la competencia de computación cuántica.\n" +
    "Revisamos cada postulación y te avisamos tu estado por mail antes " +
    `del 14 de noviembre.\n\n${renderTeamText(team)}`;
  await sendEmail(
    email,
    "QNTMJAM: Recibimos tu inscripción a la competencia",
    text,
    html,
  );
}
