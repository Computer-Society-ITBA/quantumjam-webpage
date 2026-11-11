/* eslint-disable max-len -- inline email HTML reads better unwrapped */
// The competition check-in QR email. It uses the glow header and lime
// accent of the campaign mails (scripts/campaign) rather than the shared
// shell in email.ts, so it carries no logo attachment.

import {escapeHtml, sendEmail} from "./email";
import {t, type Lang} from "./i18n";

// The coworking's address is only sent to accepted participants. If it
// is ever emptied, sendCompetitionQr refuses to send.
export const VENUE_ADDRESS =
  "Cnel. Niceto Vega 4601, Cdad. Autónoma de Buenos Aires";

const QR_CID = "competition-qr";
const QR_SIZE = 240;

const COLOR = {
  bg: "#070707",
  panel: "#121212",
  line: "#262626",
  text: "#f7f7f2",
  textDim: "#a8a8a8",
  lime: "#c8ff00",
  magenta: "#ff2fb0",
};
const FONT_SANS = "'IBM Plex Sans',Arial,Helvetica,sans-serif";
const FONT_DISPLAY = "'Archivo',Arial,sans-serif";
// Only a font every client has keeps the two header lines the same width.
const FONT_HEADER = "Arial,Helvetica,sans-serif";

const GLOW = [
  "radial-gradient(280px 190px at 10% 8%, rgba(200,255,0,0.26), " +
    "transparent 70%)",
  "radial-gradient(320px 220px at 92% 96%, rgba(255,47,176,0.24), " +
    "transparent 70%)",
  "radial-gradient(260px 170px at 94% 4%, rgba(0,229,255,0.16), " +
    "transparent 70%)",
].join(",");

const STYLE = {
  bodyText: `margin:0 0 16px;font-size:16px;line-height:1.6;color:${COLOR.text};`,
  headline:
    `margin:0 0 20px;font-family:${FONT_DISPLAY};font-weight:900;` +
    "font-size:28px;line-height:1.15;text-transform:uppercase;" +
    `color:${COLOR.text};`,
  section:
    `margin:0 0 12px;font-family:${FONT_DISPLAY};font-weight:700;` +
    "font-size:12px;letter-spacing:0.12em;text-transform:uppercase;" +
    `color:${COLOR.lime};`,
  notice:
    `margin:0 0 24px;border:1px solid ${COLOR.magenta};` +
    "border-collapse:separate;",
  noticeTag:
    "display:inline-block;margin:0 0 10px;padding:4px 10px;" +
    `background-color:${COLOR.magenta};color:${COLOR.bg};` +
    `font-family:${FONT_DISPLAY};font-weight:800;font-size:11px;` +
    "letter-spacing:0.1em;text-transform:uppercase;",
  noticeText: `margin:0;font-size:15px;line-height:1.6;color:${COLOR.text};`,
  cell:
    `padding:10px 14px;border:1px solid ${COLOR.line};` +
    `background-color:${COLOR.bg};`,
  label:
    "margin:0 0 2px;font-size:11px;letter-spacing:0.08em;" +
    `text-transform:uppercase;color:${COLOR.textDim};`,
  value: `margin:0;font-size:15px;font-weight:600;color:${COLOR.text};`,
  mateEmail: `margin:2px 0 0;font-size:14px;color:${COLOR.textDim};`,
  bullet:
    "padding:0 10px 10px 0;font-size:10px;line-height:24px;" +
    `color:${COLOR.lime};`,
  bulletText:
    `padding:0 0 10px;font-size:15px;line-height:24px;color:${COLOR.text};`,
  closing:
    "margin:20px 0 0;text-align:center;font-size:16px;line-height:1.6;" +
    `color:${COLOR.text};`,
  footerText:
    `margin:0 0 10px;font-size:12px;line-height:1.6;color:${COLOR.textDim};`,
  footerLink: `color:${COLOR.textDim};text-decoration:underline;`,
};

const INSTAGRAM_URL = "https://www.instagram.com/computer.society.itba/";
const LINKEDIN_URL = "https://www.linkedin.com/company/itba-computer-society";
const WEBSITE_URL = "https://www.csitba.com.ar/";

const BRING_KEYS = ["laptopHtml", "dni", "power", "headphones"];

export type Teammate = {name: string; email: string};

export type CompetitionQrEmail = {
  firstName: string;
  teamName: string;
  teammates: Teammate[];
  venue: string;
  lang: Lang;
};

/**
 * Renders the competition QR email.
 * @param {CompetitionQrEmail} data Who it is for and their team.
 * @return {{subject: string, text: string, html: string}} The parts.
 */
export function renderCompetitionQrEmail(
  data: CompetitionQrEmail,
): {subject: string; text: string; html: string} {
  const {lang} = data;
  const k = (key: string, params?: Record<string, string>) =>
    t(lang, `competitionTicket.${key}`, params);
  const name = data.firstName.trim();
  const greeting = name ? k("greeting", {name}) : k("greetingNoName");
  const subject = k("subject");
  const details: [string, string][] = [
    [k("whenLabel"), k("whenValue")],
    [k("timeLabel"), k("timeValue")],
    [k("whereLabel"), data.venue],
  ];
  const bring = BRING_KEYS.map((key) => k(`bring.${key}`));

  // Date and time side by side; the address gets a full-width row of its
  // own, linked to a map, so it never ends up squeezed into a narrow column.
  const mapUrl = "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(data.venue);
  const detailCells = details.slice(0, 2).map(([label, value]) => `
        <td valign="top" width="50%" bgcolor="${COLOR.bg}" style="${STYLE.cell}">
          <p style="${STYLE.label}">${escapeHtml(label)}</p>
          <p style="${STYLE.value}">${escapeHtml(value)}</p>
        </td>`).join("") + `</tr>
      <tr>
        <td colspan="2" valign="top" bgcolor="${COLOR.bg}" style="${STYLE.cell}">
          <p style="${STYLE.label}">${escapeHtml(details[2][0])}</p>
          <p style="${STYLE.value}"><a href="${escapeHtml(mapUrl)}" style="color:${COLOR.text};text-decoration:underline;">${escapeHtml(data.venue)}</a></p>
        </td>`;
  const bringRows = bring.map((item) => `
        <tr>
          <td valign="top" style="${STYLE.bullet}">&#9632;</td>
          <td valign="top" style="${STYLE.bulletText}">${item}</td>
        </tr>`).join("");
  const mates = data.teammates.length > 0 ?
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      border="0" style="margin:0 0 8px;border-collapse:collapse;">
      ${data.teammates.map((m) => `
        <tr>
          <td bgcolor="${COLOR.bg}" style="${STYLE.cell}">
            <p style="${STYLE.value}">${escapeHtml(m.name)}</p>
            <p style="${STYLE.mateEmail}"><a href="mailto:${escapeHtml(m.email)}"
              style="color:${COLOR.textDim};">${escapeHtml(m.email)}</a></p>
          </td>
        </tr>`).join("")}
    </table>` :
    `<p style="${STYLE.bodyText}">${escapeHtml(k("noMates"))}</p>`;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLOR.bg};" bgcolor="${COLOR.bg}">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${
  escapeHtml(k("preheader"))}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      border="0" bgcolor="${COLOR.bg}" style="background-color:${COLOR.bg};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
            style="width:100%;max-width:560px;font-family:${FONT_SANS};">
            <tr>
              <td align="center" bgcolor="${COLOR.bg}" style="background-color:${COLOR.bg};background-image:${GLOW};border:1px solid ${COLOR.line};padding:40px 16px 34px;">
                <p style="margin:0;font-family:${FONT_HEADER};font-weight:900;font-size:40px;line-height:1;letter-spacing:0.01em;color:${COLOR.text};">QNTM<span style="color:${COLOR.lime};">JAM</span></p>
                <p style="margin:12px 0 0;padding-left:0.2em;font-family:${FONT_HEADER};font-weight:700;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:${COLOR.lime};">${escapeHtml(k("dateBanner"))}</p>
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLOR.panel}" style="background-color:${COLOR.panel};border:1px solid ${COLOR.line};border-top:none;padding:28px 28px 32px;">
                <h1 style="${STYLE.headline}">${escapeHtml(k("headline"))}</h1>
                <p style="${STYLE.bodyText}">${escapeHtml(greeting)}</p>
                <p style="${STYLE.bodyText}">${escapeHtml(k("intro"))}</p>
                <table role="presentation" align="center" cellpadding="0"
                  cellspacing="0" border="0" bgcolor="#ffffff"
                  style="margin:8px auto 24px;background-color:#ffffff;">
                  <tr>
                    <td style="padding:12px;">
                      <img src="cid:${QR_CID}" width="${QR_SIZE}" height="${QR_SIZE}"
                        alt="${escapeHtml(k("qrAlt"))}" style="display:block;border:0;">
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0"
                  cellspacing="0" border="0"
                  style="margin:0 0 24px;border-collapse:collapse;">
                  <tr>${detailCells}</tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0"
                  cellspacing="0" border="0" style="${STYLE.notice}">
                  <tr>
                    <td bgcolor="${COLOR.bg}" style="background-color:${COLOR.bg};padding:16px 18px;">
                      <span style="${STYLE.noticeTag}">${escapeHtml(k("cantComeTag"))}</span>
                      <p style="${STYLE.noticeText}">${escapeHtml(k("cantCome"))}</p>
                    </td>
                  </tr>
                </table>
                <p style="${STYLE.section}">${escapeHtml(k("bringTitle"))}</p>
                <table role="presentation" width="100%" cellpadding="0"
                  cellspacing="0" border="0" style="margin:0 0 24px;">${bringRows}
                </table>
                <p style="${STYLE.section}">${
  escapeHtml(k("teamTitle", {team: data.teamName}))}</p>
                ${mates}
                <p style="${STYLE.closing}">${escapeHtml(k("closing"))}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 12px 0;">
                <p style="${STYLE.footerText}">
                  <a href="${INSTAGRAM_URL}" style="${STYLE.footerLink}">Instagram</a>
                  &nbsp;|&nbsp;
                  <a href="${LINKEDIN_URL}" style="${STYLE.footerLink}">LinkedIn</a>
                  &nbsp;|&nbsp;
                  <a href="${WEBSITE_URL}" style="${STYLE.footerLink}">Web</a>
                </p>
                <p style="${STYLE.footerText}">${escapeHtml(k("reason"))}</p>
                <p style="${STYLE.footerText}">IEEE Computer Society ITBA. ITBA SDF, San Martín 202, CABA.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");
  const text = [
    greeting,
    "",
    k("qrText"),
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    `${k("cantComeTag")} ${k("cantCome")}`,
    "",
    `${k("bringTitle")}:`,
    ...bring.map((item) => `- ${stripTags(item)}`),
    "",
    k("teamTitle", {team: data.teamName}),
    ...(data.teammates.length > 0 ?
      [k("teamMatesText"),
        ...data.teammates.map((m) => `- ${m.name} (${m.email})`)] :
      [k("noMates")]),
    "",
    k("closing"),
    "",
    "--",
    k("reason"),
    "IEEE Computer Society ITBA. ITBA SDF, San Martín 202, CABA.",
  ].join("\n");

  return {subject, text, html};
}

/**
 * Sends the competition QR email, with the QR inline and attached.
 * @param {string} to Recipient address.
 * @param {Buffer} png The QR image.
 * @param {Omit<CompetitionQrEmail, "venue">} data Recipient and team.
 * @return {Promise<void>} Resolves once the SMTP server accepts it.
 */
export async function sendCompetitionQrEmail(
  to: string,
  png: Buffer,
  data: Omit<CompetitionQrEmail, "venue">,
): Promise<void> {
  if (!VENUE_ADDRESS) throw new Error("VENUE_ADDRESS is not set");
  const {subject, text, html} = renderCompetitionQrEmail({
    ...data,
    venue: VENUE_ADDRESS,
  });
  await sendEmail(
    to,
    subject,
    text,
    html,
    [{filename: "qr.png", content: png, cid: QR_CID}],
    false,
  );
}
