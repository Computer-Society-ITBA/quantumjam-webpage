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
  talkAttendees: `talkAttendees${COLLECTION_SUFFIX}`,
} as const;
