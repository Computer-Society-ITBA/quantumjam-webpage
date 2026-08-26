import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'

import { functions } from '@/lib/firebase'

export type Purpose = 'workshops' | 'competition'

export type TeamChoicePayload =
  | { choice: 'alone' }
  | { choice: 'create'; name: string }
  | { choice: 'join'; code: string }

export type WorkshopSubmission = {
  email: string
  verificationToken: string
  name: string
  career: string
  level: string
  reason: string
}

export type CompetitionSubmission = {
  email: string
  verificationToken: string
  dni: string
  age: string
  university: string
  major: string
  gradYear: string
  location: string
  diet: string
  github: string
  linkedin: string
  x: string
  instagram: string
  website: string
  team: TeamChoicePayload
}

export type TeamLookupResult = {
  exists: boolean
  memberCount: number
  isFull: boolean
}

const requestVerificationCodeFn = httpsCallable<
  { email: string; purpose: Purpose },
  { ok: true; cooldownSeconds: number }
>(functions, 'requestVerificationCode')

const confirmVerificationCodeFn = httpsCallable<
  { email: string; purpose: Purpose; code: string },
  { ok: true; verificationToken: string }
>(functions, 'confirmVerificationCode')

const submitWorkshopSignupFn = httpsCallable<WorkshopSubmission, { ok: true }>(
  functions,
  'submitWorkshopSignup',
)

const submitCompetitionSignupFn = httpsCallable<
  CompetitionSubmission,
  { ok: true; teamId: string | null }
>(functions, 'submitCompetitionSignup')

const lookupTeamFn = httpsCallable<{ code: string }, TeamLookupResult>(
  functions,
  'lookupTeam',
)

export async function requestCode(email: string, purpose: Purpose) {
  const { data } = await requestVerificationCodeFn({ email, purpose })
  return data
}

export async function confirmCode(
  email: string,
  purpose: Purpose,
  code: string,
) {
  const { data } = await confirmVerificationCodeFn({ email, purpose, code })
  return data
}

export async function submitWorkshop(payload: WorkshopSubmission) {
  const { data } = await submitWorkshopSignupFn(payload)
  return data
}

export async function submitCompetition(payload: CompetitionSubmission) {
  const { data } = await submitCompetitionSignupFn(payload)
  return data
}

export async function lookupTeam(code: string): Promise<TeamLookupResult> {
  const { data } = await lookupTeamFn({ code })
  return data
}

/**
 * Strips the "functions/" prefix Firebase puts on callable error codes, so
 * call sites can switch on the same codes used server-side (already-exists,
 * not-found, resource-exhausted, ...).
 */
export function errorCode(err: unknown): string {
  if (err instanceof FirebaseError) {
    return err.code.replace(/^functions\//, '')
  }
  return 'unknown'
}
