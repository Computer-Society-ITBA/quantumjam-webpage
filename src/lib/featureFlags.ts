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
 * document does not define: registration is closed. Fail closed - a
 * missing document, a denied read or an offline visitor must never open
 * a sign-up flow that is meant to be shut.
 */
export const DEFAULT_REGISTRATION_FLAGS: RegistrationFlags = {
  workshopsRegistrationOpen: false,
  competitionRegistrationOpen: false,
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

type Listener = (flags: RegistrationFlags) => void

// One Firestore listener for the whole app: the flags are read once, on
// first use, and every later subscriber (a route change, a second
// component) is served from this cache instead of opening its own
// listener. The listener stays attached, so flipping a flag in the
// console still reaches every open tab.
let cached: RegistrationFlags | null = null
let unsubscribeFromFirestore: (() => void) | null = null
const listeners = new Set<Listener>()

/** The last value Firestore gave us, or null before the first answer. */
export function getCachedRegistrationFlags(): RegistrationFlags | null {
  return cached
}

function publish(flags: RegistrationFlags) {
  cached = flags
  for (const listener of listeners) listener(flags)
}

function start() {
  const ref = doc(db, FEATURE_FLAGS_COLLECTION, REGISTRATION_FLAGS_DOC)
  unsubscribeFromFirestore = onSnapshot(
    ref,
    (snap) => publish(parseRegistrationFlags(snap.data())),
    (error) => {
      // Almost always a rules problem: featureFlags/{flagId} has to be
      // public-read, or every visitor falls back to "closed". Loud on
      // purpose, a silent catch here looks like a broken feature flag.
      console.error('Could not read the registration feature flags', error)
      publish(DEFAULT_REGISTRATION_FLAGS)
    },
  )
}

/**
 * Subscribes to the registration flags. Returns the cached value
 * immediately when there is one, so only the first caller in a session
 * waits on Firestore.
 */
export function subscribeToRegistrationFlags(onFlags: Listener): () => void {
  listeners.add(onFlags)
  if (cached) onFlags(cached)
  if (!unsubscribeFromFirestore) start()

  return () => {
    listeners.delete(onFlags)
  }
}

/** Test seam: drops the cache and the shared Firestore listener. */
export function resetRegistrationFlagsCache() {
  unsubscribeFromFirestore?.()
  unsubscribeFromFirestore = null
  cached = null
  listeners.clear()
}
