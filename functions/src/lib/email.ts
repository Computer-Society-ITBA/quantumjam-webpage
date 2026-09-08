import * as fs from "fs";
import * as path from "path";
import nodemailer from "nodemailer";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

import {t, type Lang} from "./i18n";

import {MAX_TEAM_SIZE} from "./slug";

export const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const FROM_EMAIL = "computersociety@itba.edu.ar";

const LOGO_CID = "csitba-logo";
// functions/assets/logo.png, relative to this compiled file at
// functions/lib/lib/email.js. Kept outside src/ since tsc only emits
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
  // -- "Pending approval" style competition email --
  divider: `border:none;border-top:1px solid ${COLOR.line};margin:24px 0;`,
  dateBadge:
    `border:1px solid ${COLOR.line};text-align:center;` +
    "padding:8px 0;width:56px;",
  dateBadgeMonth:
    "margin:0;font-size:11px;letter-spacing:0.08em;" +
    `text-transform:uppercase;color:${COLOR.textDim};`,
  dateBadgeDay:
    `margin:0;font-family:${FONT_DISPLAY};font-weight:800;` +
    `font-size:20px;color:${COLOR.text};`,
  detailLabel:
    `margin:0 0 2px;font-family:${FONT_DISPLAY};font-weight:700;` +
    "font-size:11px;letter-spacing:0.08em;text-transform:uppercase;" +
    `color:${COLOR.textDim};`,
  detailValue: `margin:0 0 20px;font-size:15px;color:${COLOR.text};`,
  // Blockquote-style callout: a left accent bar with indented text.
  // Used for the intro (pending-approval explainer) and the closing
  // "still subject to confirmation" disclaimer.
  calloutBox:
    `border-left:3px solid ${COLOR.line};margin:0 0 24px;` +
    "padding:2px 0 2px 18px;",
  calloutTitle:
    `margin:0 0 10px;font-size:15px;font-weight:700;color:${COLOR.text};`,
  calloutText:
    `margin:0;font-size:15px;line-height:1.6;color:${COLOR.text};`,
  transitionText:
    "margin:0 0 20px;font-size:14px;line-height:1.6;" +
    `color:${COLOR.textDim};`,
  // -- Discord onboarding block, workshops confirmation --
  stepsTitle:
    `margin:0 0 14px;font-family:${FONT_DISPLAY};font-weight:700;` +
    "font-size:11px;letter-spacing:0.08em;text-transform:uppercase;" +
    `color:${COLOR.textDim};`,
  stepNumber:
    `font-family:${FONT_DISPLAY};font-weight:700;font-size:13px;` +
    `color:${COLOR.green};padding:0 12px 14px 0;`,
  stepText:
    `font-size:14px;line-height:1.55;color:${COLOR.text};` +
    "padding:0 0 14px;",
  inviteFallback:
    "margin:20px 0 0;font-size:12px;line-height:1.6;word-break:break-all;" +
    `color:${COLOR.textDim};`,
  // -- Shared footer, used by every email --
  footerWrap:
    `border-top:1px solid ${COLOR.line};margin-top:32px;` +
    "padding-top:24px;text-align:center;",
  footerText:
    "margin:12px 0 12px;font-size:12px;line-height:1.6;" +
    `color:${COLOR.textDim};`,
  footerLinks:
    `margin:0 0 8px;font-size:12px;line-height:1.8;color:${COLOR.textDim};`,
  footerLink: `color:${COLOR.textDim};text-decoration:none;`,
  footerCopy: `margin:12px 0 0;font-size:11px;color:${COLOR.textDim};`,
};

// Kept in sync by hand with src/lib/links.ts on the frontend. This is a
// separate TypeScript project and can't import from src/.
const DISCORD_INVITE_URL = "https://discord.gg/e9vY5tHEM";

const EVENT_PAGE_URL = "https://quantumjam.com.ar";

// The Discord first-steps list, in order. The copy for each lives under
// "workshop.steps.<key>" in the locale files; only the order is here,
// since t() resolves one string at a time.
const DISCORD_STEP_KEYS = ["join", "rules", "intro", "sessions"] as const;

const INSTAGRAM_URL = "https://instagram.com/csitba";
const LINKEDIN_URL = "https://linkedin.com/company/csitba";
const CONTACT_EMAIL_MAILTO = `mailto:${FROM_EMAIL}`;

let transporter: nodemailer.Transporter | null = null;
let emulatorTransporter: nodemailer.Transporter | null = null;
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
      auth: {user: FROM_EMAIL, pass: GMAIL_APP_PASSWORD.value()},
    });
  }
  return transporter;
}

/**
 * Lazily builds an SMTP transport pointed at a local Mailpit instance,
 * used instead of Gmail under the Functions emulator.
 * @return {nodemailer.Transporter} The Mailpit SMTP transport.
 */
function getEmulatorTransporter(): nodemailer.Transporter {
  if (!emulatorTransporter) {
    emulatorTransporter = nodemailer.createTransport({
      host: "127.0.0.1",
      port: 1025,
      secure: false,
      ignoreTLS: true,
    });
  }
  return emulatorTransporter;
}

/**
 * Lazily reads the Computer Society ITBA logo, cached for the lifetime
 * of the function instance. Reused for both the header mark and the
 * smaller footer mark: the same cid attachment can be referenced by
 * more than one <img> in the same email.
 * @return {Buffer} The logo PNG bytes.
 */
function getLogoBuffer(): Buffer {
  if (!logoBuffer) {
    logoBuffer = fs.readFileSync(LOGO_PATH);
  }
  return logoBuffer;
}

/**
 * Escapes text so it's safe to inline into the HTML email body: team
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
 * Renders the compressed, classic-style footer shared by every email:
 * logo mark, one-line blurb, social/contact links, address and
 * copyright. No event-specific content.
 * @param {Lang} lang Language to render the footer in.
 * @return {string} Footer HTML.
 */
function renderFooter(lang: Lang): string {
  return `
    <tr>
      <td style="${STYLE.footerWrap}">
        <p style="${STYLE.footerText}">${t(lang, "footer.blurb")}</p>
        <p style="${STYLE.footerLinks}">
          <a href="${INSTAGRAM_URL}" style="${STYLE.footerLink}">Instagram</a>
          &nbsp;|&nbsp;
          <a href="${CONTACT_EMAIL_MAILTO}" style="${STYLE.footerLink}">
            ${FROM_EMAIL}
          </a>
          &nbsp;|&nbsp;
          <a href="${LINKEDIN_URL}" style="${STYLE.footerLink}">LinkedIn</a>
        </p>
        <p style="${STYLE.footerLinks}">${t(lang, "footer.address")}</p>
        <p style="${STYLE.footerCopy}">${t(lang, "footer.copyright")}</p>
      </td>
    </tr>
  `;
}

/**
 * Wraps email body HTML in the shared QNTMJAM-branded shell (dark
 * panel, Archivo display font, brand-green accent) matching the site,
 * plus the shared compressed footer below it.
 *
 * Built as nested tables with explicit `bgcolor` attributes rather than
 * a plain `<body>`/`<div>` background: mobile Gmail's auto dark-mode
 * otherwise ignores CSS-only backgrounds and re-renders the email in
 * its own light theme.
 * @param {string} bodyHtml Inner content HTML.
 * @param {Lang} lang Language to render the shell (footer) in.
 * @return {string} The full HTML document.
 */
function renderEmailShell(bodyHtml: string, lang: Lang): string {
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
                <table role="presentation" width="100%" cellpadding="0"
                  cellspacing="0" border="0">
                  ${renderFooter(lang)}
                </table>
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
 * Sends an email via Gmail SMTP, or via a local Mailpit instance when
 * running under the Functions emulator, so nothing real gets sent
 * during local testing.
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
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const mail = {
    from: `QNTMJAM <${FROM_EMAIL}>`,
    to,
    subject,
    text,
    html,
    attachments: [
      {filename: "logo.png", content: getLogoBuffer(), cid: LOGO_CID},
    ],
  };
  try {
    if (isEmulator) {
      await getEmulatorTransporter().sendMail(mail);
      logger.info(`[emulator] Sent via Mailpit: ${to} / ${subject}`);
    } else {
      await getTransporter().sendMail(mail);
    }
  } catch (err) {
    logger.error("Failed to send email", {to, subject, err});
    throw err;
  }
}

/**
 * Sends a verification code to an email via Gmail SMTP.
 * @param {string} email Recipient address.
 * @param {string} code The plaintext code to include in the email.
 * @param {Lang} lang Language to render the email in.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
  lang: Lang,
): Promise<void> {
  const html = renderVerificationCodeHtml(code, lang);
  const text = t(lang, "verification.textBody", {code});
  await sendEmail(email, t(lang, "verification.subject"), text, html);
}


/**
 * Sends the post-registration confirmation email for the workshops flow.
 * @param {string} email Recipient address.
 * @param {Lang} lang Language to render the email in.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendWorkshopConfirmationEmail(
  email: string,
  lang: Lang,
): Promise<void> {
  const html = renderWorkshopConfirmationHtml(lang);
  const steps = DISCORD_STEP_KEYS.map(
    (key, i) => `${i + 1}. ${t(lang, `workshop.steps.${key}`)}`,
  ).join("\n");
  const text =
    `${t(lang, "workshop.textIntro")}\n\n` +
    `${t(lang, "workshop.textDiscord")}\n${DISCORD_INVITE_URL}\n\n` +
    `${t(lang, "workshop.stepsTitle")}\n${steps}\n\n` +
    t(lang, "workshop.textFallback", {url: DISCORD_INVITE_URL});
  await sendEmail(email, t(lang, "workshop.subject"), text, html);
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
 * Renders the team-status detail rows for the competition confirmation
 * email, styled as flat label/value pairs to match the rest of the
 * event-detail block.
 * @param {CompetitionConfirmationTeam} team Team info to render.
 * @param {Lang} lang Language to render the section in.
 * @return {string} HTML for the team section.
 */
function renderTeamSection(
  team: CompetitionConfirmationTeam,
  lang: Lang,
): string {
  if (team.choice === "alone") {
    return `
      <p style="${STYLE.detailLabel}">${t(lang, "competition.team.label")}</p>
      <p style="${STYLE.detailValue}">
        ${t(lang, "competition.team.aloneHtml", {maxTeamSize: MAX_TEAM_SIZE})}
      </p>
    `;
  }
  return `
    <p style="${STYLE.detailLabel}">${t(lang, "competition.team.label")}</p>
    <p style="${STYLE.teamName}">${escapeHtml(team.name)}</p>
    <p style="${STYLE.teamCode}">${escapeHtml(team.code)}</p>
    <p style="${STYLE.detailValue}">
      ${t(lang, "competition.team.memberCount", {
    count: team.memberCount,
    max: MAX_TEAM_SIZE,
  })}
    </p>
  `;
}

/**
 * Builds the plain-text team-status line for the competition
 * confirmation email.
 * @param {CompetitionConfirmationTeam} team Team info to render.
 * @param {Lang} lang Language to render the text in.
 * @return {string} Plain-text team status.
 */
function renderTeamText(team: CompetitionConfirmationTeam, lang: Lang): string {
  if (team.choice === "alone") {
    return `${t(lang, "competition.team.label")}: ` +
      t(lang, "competition.team.aloneText", {maxTeamSize: MAX_TEAM_SIZE});
  }
  return t(lang, "competition.team.textLine", {
    name: team.name,
    code: team.code,
    count: team.memberCount,
    max: MAX_TEAM_SIZE,
  });
}

/**
 * Renders the verification-code email body: the code itself in a
 * bordered box, plus a short expiry note.
 * @param {string} code The plaintext code to display.
 * @param {Lang} lang Language to render the email in.
 * @return {string} The full HTML document.
 */
export function renderVerificationCodeHtml(code: string, lang: Lang): string {
  return renderEmailShell(`
    <p style="${STYLE.label}">${t(lang, "verification.label")}</p>
    <div style="${STYLE.codeBox}">
      <span style="${STYLE.code}">${code}</span>
    </div>
    <p style="${STYLE.fine}">${t(lang, "verification.fine")}</p>
  `, lang);
}

/**
 * Renders the numbered Discord first-steps list as a table, so the
 * number column stays aligned in clients that ignore list styling.
 * @param {Lang} lang Language to render the steps in.
 * @return {string} HTML for the steps block.
 */
function renderDiscordSteps(lang: Lang): string {
  const rows = DISCORD_STEP_KEYS.map(
    (key, i) => `
      <tr>
        <td valign="top" style="${STYLE.stepNumber}">
          ${String(i + 1).padStart(2, "0")}
        </td>
        <td valign="top" style="${STYLE.stepText}">${escapeHtml(
  t(lang, `workshop.steps.${key}`),
)}</td>
      </tr>`,
  ).join("");

  return `
    <p style="${STYLE.stepsTitle}">${t(lang, "workshop.stepsTitle")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      border="0">
      ${rows}
    </table>
  `;
}

/**
 * Renders the workshop confirmation email body: the Discord invite and
 * what to do once inside, mirroring the confirmation screen on the site
 * so someone who closed the tab still has the instructions.
 * @param {Lang} lang Language to render the email in.
 * @return {string} The full HTML document.
 */
export function renderWorkshopConfirmationHtml(lang: Lang): string {
  return renderEmailShell(`
    <p style="${STYLE.bodyText}">${t(lang, "workshop.introHtml")}</p>
    <p style="${STYLE.dimText}">${t(lang, "workshop.discordBlurb")}</p>
    <p style="text-align:center;margin:0 0 28px;">
      <a href="${DISCORD_INVITE_URL}" style="${STYLE.ctaButton}">${t(
  lang,
  "workshop.cta",
)}</a>
    </p>

    <hr style="${STYLE.divider}">

    ${renderDiscordSteps(lang)}

    <p style="${STYLE.inviteFallback}">
      ${t(lang, "workshop.htmlFallback")}<br>${DISCORD_INVITE_URL}
    </p>
  `, lang);
}

/**
 * Renders the competition confirmation email: an intro callout
 * explaining the pending-approval status, the event-details card
 * (date/time, location, duration, team), the event-page CTA, and a
 * closing callout noting those details and the team's spot are still
 * unconfirmed.
 * @param {CompetitionConfirmationTeam} team Team info to include.
 * @param {Lang} lang Language to render the email in.
 * @return {string} The full HTML document.
 */
export function renderCompetitionConfirmationHtml(
  team: CompetitionConfirmationTeam,
  lang: Lang,
): string {
  return renderEmailShell(`
    <div style="${STYLE.calloutBox}">
      <p style="${STYLE.calloutTitle}">
        ${t(lang, "competition.calloutTitle")}
      </p>
      <p style="${STYLE.calloutText}">
        ${t(lang, "competition.calloutTextHtml")}
      </p>
    </div>
    <hr style="${STYLE.divider}">
    <table role="presentation" width="100%" cellpadding="0"
      cellspacing="0" border="0" style="margin:0 0 20px;">
      <tr>
        <td width="56" valign="top" style="${STYLE.dateBadge}">
          <p style="${STYLE.dateBadgeMonth}">
            ${t(lang, "competition.details.dateMonth")}
          </p>
          <p style="${STYLE.dateBadgeDay}">
            ${t(lang, "competition.details.dateDay")}
          </p>
        </td>
        <td valign="top" style="padding-left:16px;">
          <p style="${STYLE.teamName}">
            ${t(lang, "competition.details.dateLabel")}
          </p>
          <p style="${STYLE.teamMeta}">
            ${t(lang, "competition.details.timeRange")}
          </p>
        </td>
      </tr>
    </table>
    <p style="${STYLE.detailLabel}">${t(lang, "competition.locationLabel")}</p>
    <p style="${STYLE.detailValue}">
      ${t(lang, "competition.details.location")}
    </p>
    <p style="${STYLE.detailLabel}">${t(lang, "competition.durationLabel")}</p>
    <p style="${STYLE.detailValue}">
      ${t(lang, "competition.details.duration")}
    </p>
    ${renderTeamSection(team, lang)}
    <hr style="${STYLE.divider}">
    <p style="text-align:center;margin:0 0 24px;">
      <a href="${EVENT_PAGE_URL}" style="${STYLE.ctaButton}">
        ${t(lang, "competition.ctaEventPage")}
      </a>
    </p>
    <div style="${STYLE.calloutBox}">
      <p style="${STYLE.calloutText}">
        ${t(lang, "competition.disclaimerHtml")}
      </p>
    </div>
  `, lang);
}

/**
 * Sends the post-registration confirmation email for the competition
 * flow: a pending-approval explainer, the event details card (date,
 * time, location, duration, team), and a closing disclaimer noting
 * those details and the team's spot are still unconfirmed.
 * @param {string} email Recipient address.
 * @param {CompetitionConfirmationTeam} team Team info to include.
 * @param {Lang} lang Language to render the email in.
 * @return {Promise<void>} Resolves once the send is accepted.
 */
export async function sendCompetitionConfirmationEmail(
  email: string,
  team: CompetitionConfirmationTeam,
  lang: Lang,
): Promise<void> {
  const html = renderCompetitionConfirmationHtml(team, lang);
  const text =
    `${t(lang, "competition.textIntro")}\n\n` +
    `${t(lang, "competition.textEventInfoHeading")}\n\n` +
    `${t(lang, "competition.textDateTime", {
      dateLabel: t(lang, "competition.details.dateLabel"),
      timeRange: t(lang, "competition.details.timeRange"),
    })}\n` +
    `${t(lang, "competition.textLocation", {
      location: t(lang, "competition.details.location"),
    })}\n` +
    `${t(lang, "competition.textDuration", {
      duration: t(lang, "competition.details.duration"),
    })}\n\n` +
    `${renderTeamText(team, lang)}\n\n` +
    `${t(lang, "competition.textEventPage", {url: EVENT_PAGE_URL})}\n\n` +
    t(lang, "competition.textDisclaimer");
  await sendEmail(email, t(lang, "competition.subject"), text, html);
}
