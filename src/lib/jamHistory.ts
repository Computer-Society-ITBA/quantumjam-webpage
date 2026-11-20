import type { JamTradePoint } from '@/hooks/useJam'
import { marketPrices, type JamMarket } from '@/lib/jamMarket'

export type PricePoint = { t: number; prices: Record<string, number> }

// Enough points for a smooth line at any width, few enough to stay cheap.
const MAX_POINTS = 400

/**
 * Rebuilds every team's price over time by replaying the trades from an
 * empty market, the same way the market maker priced them. The finalists
 * cut is applied from the moment it happened, so the jump shows on the
 * chart. The last point is the market's live prices.
 */
export function buildPriceHistory(
  market: Pick<
    JamMarket,
    'teams' | 'b' | 'prices' | 'finalists' | 'finalistsAtMillis'
  >,
  trades: JamTradePoint[],
  now: number,
): PricePoint[] {
  const q: Record<string, number> = {}
  for (const team of market.teams) q[team.id] = 0
  const cut = market.finalistsAtMillis
  const activeAt = (t: number) =>
    cut !== null && t >= cut ? market.finalists : null

  const start = trades.length ? trades[0].atMillis - 1 : now - 1
  const points: PricePoint[] = [
    { t: start, prices: marketPrices(q, market.b, activeAt(start)) },
  ]
  let cutDone = cut === null
  for (const trade of trades) {
    if (!cutDone && cut !== null && trade.atMillis >= cut) {
      points.push({ t: cut, prices: marketPrices(q, market.b, activeAt(cut)) })
      cutDone = true
    }
    if (!(trade.teamId in q)) continue
    q[trade.teamId] += trade.side === 'buy' ? trade.shares : -trade.shares
    points.push({
      t: trade.atMillis,
      prices: marketPrices(q, market.b, activeAt(trade.atMillis)),
    })
  }
  if (!cutDone && cut !== null) {
    points.push({ t: cut, prices: marketPrices(q, market.b, activeAt(cut)) })
  }
  points.push({
    t: Math.max(now, points[points.length - 1].t),
    prices: market.prices,
  })

  if (points.length <= MAX_POINTS) return points
  // Keep the first, the last and an even sample in between.
  const step = (points.length - 1) / (MAX_POINTS - 1)
  return Array.from(
    { length: MAX_POINTS },
    (_, i) => points[Math.round(i * step)],
  )
}
