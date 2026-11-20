import {COLLECTION_SUFFIX} from "./environment";

export const collections = {
  campaignEvents: `campaignEvents${COLLECTION_SUFFIX}`,
  emailContacts: `emailContacts${COLLECTION_SUFFIX}`,
  emailVerifications: `emailVerifications${COLLECTION_SUFFIX}`,
  featureFlags: `featureFlags${COLLECTION_SUFFIX}`,
  workshopSignups: `workshopSignups${COLLECTION_SUFFIX}`,
  competitionSignups: `competitionSignups${COLLECTION_SUFFIX}`,
  sponsorInquiries: `sponsorInquiries${COLLECTION_SUFFIX}`,
  signupDrafts: `signupDrafts${COLLECTION_SUFFIX}`,
  teams: `teams${COLLECTION_SUFFIX}`,
  // Prediction-market game ("Compys"). The market doc and the players and
  // trades are public-read (odds + leaderboard); secrets and verifications
  // are written and read only by Cloud Functions.
  jamMarket: `jamMarket${COLLECTION_SUFFIX}`,
  jamPlayers: `jamPlayers${COLLECTION_SUFFIX}`,
  jamPlayerSecrets: `jamPlayerSecrets${COLLECTION_SUFFIX}`,
  jamVerifications: `jamVerifications${COLLECTION_SUFFIX}`,
  jamTrades: `jamTrades${COLLECTION_SUFFIX}`,
} as const;

// The single market document lives at jamMarket/state.
export const JAM_MARKET_DOC = "state";
