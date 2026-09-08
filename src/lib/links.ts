/**
 * Shared external links. Kept in one place so a change (a new Discord
 * invite, say) is a single edit. The Cloud Functions email templates hold
 * their own copy in `functions/src/lib/email.ts` - that is a separate
 * TypeScript project and cannot import from `src/`.
 */
export const DISCORD_INVITE_URL = 'https://discord.gg/e9vY5tHEM'
