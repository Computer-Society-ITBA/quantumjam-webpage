import { ENVIRONMENT } from './environment'

const suffix = ENVIRONMENT === 'development' ? '_staging' : ''

export const collections = {
  emailContacts: `emailContacts${suffix}`,
  emailVerifications: `emailVerifications${suffix}`,
  featureFlags: `featureFlags${suffix}`,
  workshopSignups: `workshopSignups${suffix}`,
  competitionSignups: `competitionSignups${suffix}`,
} as const
