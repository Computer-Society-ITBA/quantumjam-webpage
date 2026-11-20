import { COLLECTION_SUFFIX } from '@/lib/environment'

// Collection names mirror functions/src/lib/collections.ts. Only the three
// public-read ones are read from the client; writes go through callables.
export const JAM_MARKET_COLLECTION = `jamMarket${COLLECTION_SUFFIX}`
export const JAM_PLAYERS_COLLECTION = `jamPlayers${COLLECTION_SUFFIX}`
export const JAM_TRADES_COLLECTION = `jamTrades${COLLECTION_SUFFIX}`
export const JAM_MARKET_DOC = 'state'

// A champion share pays up to 100 Compys; prices sit in [0, 100] and sum to
// 100 across the active teams. Mirrors functions/src/jam/lmsr.ts.
export const PRICE_SCALE = 100

export type JamPhase = 'setup' | 'open' | 'frozen' | 'settled'
export type JamTeam = { id: string; name: string }

export type JamMarket = {
  phase: JamPhase
  b: number
  startingCash: number
  payouts: number[]
  teams: JamTeam[]
  q: Record<string, number>
  prices: Record<string, number>
  // Once set, only these teams can be traded or win; the rest are at 0.
  finalists: string[] | null
  finalistsAtMillis: number | null
  podium: string[] | null
}

export type JamPlayer = {
  playerId: string
  displayName: string
  cash: number
  holdings: Record<string, number>
}

export type JamTrade = {
  id: string
  displayName: string
  teamId: string
  teamName: string
  side: 'buy' | 'sell'
  shares: number
  compys: number
  atMillis: number
}

function numberRecord(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null) return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'number' && Number.isFinite(raw)) out[key] = raw
  }
  return out
}

function stringList(value: unknown): string[] | null {
  return Array.isArray(value)
    ? (value as unknown[]).filter((v): v is string => typeof v === 'string')
    : null
}

/** Parses the market document defensively; returns null when unusable. */
export function parseMarket(data: Record<string, unknown> | undefined) {
  if (!data) return null
  const phase = data.phase
  if (
    phase !== 'setup' &&
    phase !== 'open' &&
    phase !== 'frozen' &&
    phase !== 'settled'
  ) {
    return null
  }
  const teams = Array.isArray(data.teams)
    ? (data.teams as unknown[]).flatMap((team) => {
        const t = team as { id?: unknown; name?: unknown }
        return typeof t?.id === 'string' && typeof t?.name === 'string'
          ? [{ id: t.id, name: t.name }]
          : []
      })
    : []
  const payouts = Array.isArray(data.payouts)
    ? (data.payouts as unknown[]).filter(
        (n): n is number => typeof n === 'number',
      )
    : [PRICE_SCALE]
  const finalistsAt = data.finalistsAt as { toMillis?: () => number } | null
  const finalists = stringList(data.finalists)
  const market: JamMarket = {
    phase,
    b: typeof data.b === 'number' ? data.b : 4000,
    startingCash: typeof data.startingCash === 'number' ? data.startingCash : 0,
    payouts,
    teams,
    q: numberRecord(data.q),
    prices: numberRecord(data.prices),
    finalists: finalists && finalists.length > 0 ? finalists : null,
    finalistsAtMillis:
      typeof finalistsAt?.toMillis === 'function'
        ? finalistsAt.toMillis()
        : null,
    podium: stringList(data.podium),
  }
  return market
}

/** Whether a team is still in play (a finalist, or any team before then). */
export function isActive(
  market: Pick<JamMarket, 'finalists'>,
  teamId: string,
): boolean {
  return !market.finalists || market.finalists.includes(teamId)
}

/** The shares vector restricted to the active teams. */
export function activeQ(
  q: Record<string, number>,
  finalists: string[] | null,
): Record<string, number> {
  if (!finalists) return q
  const out: Record<string, number> = {}
  for (const id of finalists) out[id] = q[id] ?? 0
  return out
}

/** Softmax price per team, in Compys per share (sums to PRICE_SCALE). */
export function prices(
  q: Record<string, number>,
  b: number,
): Record<string, number> {
  const ids = Object.keys(q)
  if (ids.length === 0) return {}
  const z = ids.map((id) => q[id] / b)
  const m = Math.max(...z)
  const exps = z.map((v) => Math.exp(v - m))
  const sum = exps.reduce((acc, v) => acc + v, 0) || 1
  const out: Record<string, number> = {}
  ids.forEach((id, i) => {
    out[id] = (PRICE_SCALE * exps[i]) / sum
  })
  return out
}

/** Prices for every team: active teams share 100, eliminated ones are 0. */
export function marketPrices(
  q: Record<string, number>,
  b: number,
  finalists: string[] | null,
): Record<string, number> {
  const live = prices(activeQ(q, finalists), b)
  const out: Record<string, number> = {}
  for (const id of Object.keys(q)) out[id] = live[id] ?? 0
  return out
}

function cost(q: Record<string, number>, b: number): number {
  const z = Object.values(q).map((v) => v / b)
  if (z.length === 0) return 0
  const m = Math.max(...z)
  const lse = m + Math.log(z.reduce((acc, v) => acc + Math.exp(v - m), 0))
  return PRICE_SCALE * b * lse
}

/**
 * Compys to buy (shares > 0) or receive from selling (shares < 0) `shares`
 * of a team. Mirrors the server so the client can preview the cost; the
 * server stays authoritative. Pass the active shares vector.
 */
export function tradeCost(
  q: Record<string, number>,
  b: number,
  id: string,
  shares: number,
): number {
  const next = { ...q, [id]: (q[id] ?? 0) + shares }
  return cost(next, b) - cost(q, b)
}

function weights(q: Record<string, number>, b: number, id: string) {
  const ids = Object.keys(q)
  const m = Math.max(...ids.map((k) => q[k] / b))
  let a = 0
  for (const k of ids) if (k !== id) a += Math.exp(q[k] / b - m)
  return { a, e: Math.exp((q[id] ?? 0) / b - m) }
}

/** Shares a budget buys right now, as a real number. Mirrors the server. */
export function sharesForBudget(
  q: Record<string, number>,
  b: number,
  id: string,
  budget: number,
): number {
  if (budget <= 0) return 0
  const { a, e } = weights(q, b, id)
  const z = a + e
  const x = budget / (PRICE_SCALE * b)
  return (
    b * (Math.log(z) + x + Math.log1p(-a / (z * Math.exp(x))) - Math.log(e))
  )
}

/** Shares to sell to receive `proceeds`; Infinity if unreachable. */
export function sharesForProceeds(
  q: Record<string, number>,
  b: number,
  id: string,
  proceeds: number,
): number {
  if (proceeds <= 0) return 0
  const { a, e } = weights(q, b, id)
  const inner = ((a + e) * Math.exp(-proceeds / (PRICE_SCALE * b)) - a) / e
  return inner > 0 ? -b * Math.log(inner) : Infinity
}

const COMPYS_FORMAT = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 0,
})

/** Formats a Compys amount as a grouped integer (e.g. 1.000.000). */
export function formatCompys(value: number): string {
  return COMPYS_FORMAT.format(Math.round(value))
}

const TWO_DECIMALS = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const ONE_DECIMAL = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const SMALL = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumSignificantDigits: 3,
})

/**
 * Formats a share price (0 to 100 Compys). Two decimals from 1 up; below
 * that, three significant digits, so a cheap share never reads as 0,00
 * (e.g. 0,00432). Only an eliminated team, at exactly 0, shows 0.
 */
export function formatPrice(value: number): string {
  if (value === 0) return '0'
  return value >= 1 ? TWO_DECIMALS.format(value) : SMALL.format(value)
}

/** Formats a probability in percent with the same never-zero rule. */
export function formatPercent(value: number): string {
  if (value === 0) return '0%'
  return `${value >= 1 ? ONE_DECIMAL.format(value) : SMALL.format(value)}%`
}

/**
 * What holdings would pay if sold all at once right now. Valuing shares at
 * the last marginal price instead overstates them (a buyer pays the average
 * price along the curve). Shares of eliminated teams (outside q) are worth
 * 0. Mirrors liquidationValue in functions/src/jam/lmsr.ts.
 */
export function liquidationValue(
  q: Record<string, number>,
  b: number,
  holdings: Record<string, number>,
): number {
  const after = { ...q }
  let any = false
  for (const [id, shares] of Object.entries(holdings)) {
    if (!(id in q)) continue
    after[id] -= shares
    any = true
  }
  return any ? cost(q, b) - cost(after, b) : 0
}

/** A player's net worth: cash plus what their shares would sell for now. */
export function netWorth(
  cash: number,
  holdings: Record<string, number>,
  market: Pick<JamMarket, 'q' | 'b' | 'finalists'>,
): number {
  return (
    cash +
    liquidationValue(activeQ(market.q, market.finalists), market.b, holdings)
  )
}
