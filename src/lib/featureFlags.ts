import { doc, onSnapshot } from 'firebase/firestore'

import { db } from '@/lib/firebase'

export type RegistrationEvent = 'workshops' | 'competition'

export type RegistrationFlags = {
  workshopsRegistrationOpen: boolean
  competitionRegistrationOpen: boolean
}

export const FEATURE_FLAGS_COLLECTION = 'featureFlags'
export const REGISTRATION_FLAGS_DOC = 'registration'

/**
 * What the app assumes before Firestore answers, and for any flag the
 * document does not define: registration stays open. A missing document
 * must not take the sign-up forms down, so closing a flow is always an
 * explicit `false` in Firestore.
 */
export const DEFAULT_REGISTRATION_FLAGS: RegistrationFlags = {
  workshopsRegistrationOpen: true,
  competitionRegistrationOpen: true,
}

const FLAG_KEY: Record<RegistrationEvent, keyof RegistrationFlags> = {
  workshops: 'workshopsRegistrationOpen',
  competition: 'competitionRegistrationOpen',
}

/**
 * Reads the flags out of a raw Firestore document, ignoring anything
 * that is not an explicit boolean.
 */
export function parseRegistrationFlags(
  data: Record<string, unknown> | undefined,
): RegistrationFlags {
  const read = (key: keyof RegistrationFlags) =>
    typeof data?.[key] === 'boolean'
      ? (data[key] as boolean)
      : DEFAULT_REGISTRATION_FLAGS[key]
  return {
    workshopsRegistrationOpen: read('workshopsRegistrationOpen'),
    competitionRegistrationOpen: read('competitionRegistrationOpen'),
  }
}

export function isRegistrationOpen(
  flags: RegistrationFlags,
  event: RegistrationEvent,
): boolean {
  return flags[FLAG_KEY[event]]
}

/**
 * Subscribes to the registration flags. Errors (offline, rules) fall back
 * to the defaults rather than leaving the caller without an answer.
 */
export function subscribeToRegistrationFlags(
  onFlags: (flags: RegistrationFlags) => void,
): () => void {
  const ref = doc(db, FEATURE_FLAGS_COLLECTION, REGISTRATION_FLAGS_DOC)
  return onSnapshot(
    ref,
    (snap) => onFlags(parseRegistrationFlags(snap.data())),
    () => onFlags(DEFAULT_REGISTRATION_FLAGS),
  )
}
