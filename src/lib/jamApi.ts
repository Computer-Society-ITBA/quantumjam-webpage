import { FirebaseError } from 'firebase/app'
import { httpsCallable } from 'firebase/functions'

import { functions } from '@/lib/firebase'

export type JamSession = {
  playerId: string
  sessionToken: string
  displayName: string
}

export type JamPlayerState = {
  playerId: string
  displayName: string
  cash: number
  holdings: Record<string, number>
}

const SESSION_KEY = 'jam.session'

/** Reads the saved browser session, or null when there is none. */
export function loadSession(): JamSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<JamSession>
    if (
      typeof data.playerId === 'string' &&
      typeof data.sessionToken === 'string' &&
      typeof data.displayName === 'string'
    ) {
      return data as JamSession
    }
  } catch {
    // Private mode, blocked storage, or malformed JSON: no session.
  }
  return null
}

export function saveSession(session: JamSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Non-fatal: the session just will not persist across reloads.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore.
  }
}

const requestCodeFn = httpsCallable<
  { email: string; lang: string },
  { ok: true; cooldownSeconds: number }
>(functions, 'jamRequestCode')

const confirmCodeFn = httpsCallable<
  { email: string; code: string },
  { ok: true; sessionToken: string } & JamPlayerState
>(functions, 'jamConfirmCode')

const sessionFn = httpsCallable<
  { playerId: string; sessionToken: string },
  { ok: true } & JamPlayerState
>(functions, 'jamSession')

/**
 * How much to trade: a whole number of shares, or a Compys amount (spend it
 * when buying, receive about that much when selling). The server converts
 * an amount to shares at the exact price of the moment it executes.
 */
export type JamTradeAmount = { shares: number } | { compys: number }

const tradeFn = httpsCallable<
  {
    playerId: string
    sessionToken: string
    teamId: string
    side: 'buy' | 'sell'
  } & JamTradeAmount,
  {
    ok: true
    cash: number
    holdings: Record<string, number>
    shares: number
    compys: number
  }
>(functions, 'jamTrade')

export async function jamRequestCode(email: string, lang: string) {
  const { data } = await requestCodeFn({ email, lang })
  return data
}

export async function jamConfirmCode(email: string, code: string) {
  const { data } = await confirmCodeFn({ email, code })
  return data
}

export async function jamValidateSession(session: JamSession) {
  const { data } = await sessionFn({
    playerId: session.playerId,
    sessionToken: session.sessionToken,
  })
  return data
}

export async function jamTrade(
  session: JamSession,
  teamId: string,
  side: 'buy' | 'sell',
  amount: JamTradeAmount,
) {
  const { data } = await tradeFn({
    playerId: session.playerId,
    sessionToken: session.sessionToken,
    teamId,
    side,
    ...amount,
  })
  return data
}

/** Strips the "functions/" prefix from a callable error code. */
export function jamErrorCode(err: unknown): string {
  if (err instanceof FirebaseError) {
    return err.code.replace(/^functions\//, '')
  }
  return 'unknown'
}
