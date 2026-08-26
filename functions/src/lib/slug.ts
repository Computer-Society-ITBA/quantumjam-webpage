export const MAX_TEAM_SIZE = 4;

/**
 * Server-side copy of teamIdFrom() in
 * src/components/registration/wizard.ts — the two are separate TypeScript
 * projects and can't share code, so keep this in sync by hand.
 * @param {string} name Team name or code as typed by the user.
 * @return {string} The slug used as the team's Firestore doc ID.
 */
export function teamIdFrom(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
}
