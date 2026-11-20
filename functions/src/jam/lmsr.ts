// Logarithmic Market Scoring Rule (LMSR) automated market maker.
//
// The market has one share per team: at settlement a share of the winning
// team pays PRICE_SCALE Compys and every other share pays nothing. During
// trading the price of a team is its implied probability of winning, scaled
// to Compys so a single share costs between 0 and PRICE_SCALE Compys. Prices
// across the active teams always sum to PRICE_SCALE (the normalized
// "wavefunction"): buying one team drains the others. Liquidity is set by `b`
// (higher = prices move more slowly).
//
// Once finalists are chosen only they stay active: every formula runs on the
// finalists' shares alone, so each finalist's probability becomes its weight
// divided by the finalists' total weight, and eliminated teams are worth 0.

// A champion share pays 100 Compys if that team wins; prices are scaled to
// match, so every price sits in [0, 100].
export const PRICE_SCALE = 100;

export type QVector = Record<string, number>;

/**
 * Stable log-sum-exp of the vector {q_i / b}. Subtracting the max keeps
 * exp() from overflowing when shares outstanding get large.
 * @param {number[]} z The exponents q_i / b.
 * @return {number} log(sum(exp(z_i))).
 */
function logSumExp(z: number[]): number {
  if (z.length === 0) return 0;
  const m = Math.max(...z);
  let sum = 0;
  for (const v of z) sum += Math.exp(v - m);
  return m + Math.log(sum);
}

/**
 * Restricts the shares vector to the teams still in play: the finalists
 * once they are set, every team before that.
 * @param {QVector} q Shares outstanding per team.
 * @param {string[] | null} active The finalists, or null for all teams.
 * @return {QVector} The shares of the active teams only.
 */
export function activeQ(q: QVector, active: string[] | null): QVector {
  if (!active) return q;
  const out: QVector = {};
  for (const id of active) out[id] = q[id] ?? 0;
  return out;
}

/**
 * Current price of every team, in Compys per share. Equals the softmax of
 * {q_i / b} times PRICE_SCALE, so the prices sum to PRICE_SCALE.
 * @param {QVector} q Shares outstanding per team.
 * @param {number} b Liquidity parameter.
 * @return {Record<string, number>} Price per team id.
 */
export function prices(q: QVector, b: number): Record<string, number> {
  const ids = Object.keys(q);
  const z = ids.map((id) => q[id] / b);
  const m = ids.length ? Math.max(...z) : 0;
  const exps = z.map((v) => Math.exp(v - m));
  const sum = exps.reduce((acc, v) => acc + v, 0) || 1;
  const out: Record<string, number> = {};
  ids.forEach((id, i) => {
    out[id] = (PRICE_SCALE * exps[i]) / sum;
  });
  return out;
}

/**
 * Prices for every team in the market: the active teams share PRICE_SCALE,
 * eliminated teams are at 0.
 * @param {QVector} q Shares outstanding per team (all teams).
 * @param {number} b Liquidity parameter.
 * @param {string[] | null} active The finalists, or null for all teams.
 * @return {Record<string, number>} Price per team id.
 */
export function marketPrices(
  q: QVector,
  b: number,
  active: string[] | null,
): Record<string, number> {
  const live = prices(activeQ(q, active), b);
  const out: Record<string, number> = {};
  for (const id of Object.keys(q)) out[id] = live[id] ?? 0;
  return out;
}

/**
 * The LMSR cost function C(q) = PRICE_SCALE * b * logSumExp(q_i / b). The
 * cost of a trade is the difference in C between the new and old q vectors.
 * @param {QVector} q Shares outstanding per team.
 * @param {number} b Liquidity parameter.
 * @return {number} The cost-function value in Compys.
 */
export function cost(q: QVector, b: number): number {
  const z = Object.values(q).map((v) => v / b);
  return PRICE_SCALE * b * logSumExp(z);
}

/**
 * Signed Compys for moving team `id` by `shares` (positive to buy, negative
 * to sell): positive result is Compys the trader pays, negative is Compys
 * the trader receives.
 * @param {QVector} q Shares outstanding per team.
 * @param {number} b Liquidity parameter.
 * @param {string} id The team being traded.
 * @param {number} shares Share delta (positive buy, negative sell).
 * @return {number} The signed cost in Compys.
 */
export function tradeCost(
  q: QVector,
  b: number,
  id: string,
  shares: number,
): number {
  const next: QVector = {...q, [id]: (q[id] ?? 0) + shares};
  return cost(next, b) - cost(q, b);
}

/**
 * Splits q into the traded team's weight E and everyone else's weight A,
 * both scaled by the same max so exp() cannot overflow.
 * @param {QVector} q Shares outstanding per team.
 * @param {number} b Liquidity parameter.
 * @param {string} id The traded team.
 * @return {{a: number, e: number}} The two weights.
 */
function weights(q: QVector, b: number, id: string): {a: number; e: number} {
  const ids = Object.keys(q);
  const m = Math.max(...ids.map((k) => q[k] / b));
  let a = 0;
  for (const k of ids) if (k !== id) a += Math.exp(q[k] / b - m);
  return {a, e: Math.exp((q[id] ?? 0) / b - m)};
}

/**
 * How many shares of team `id` a budget buys right now, as a real number.
 * Inverts cost = S*b*ln((A + E*e^(D/b)) / (A + E)) for D.
 * @param {QVector} q Shares outstanding per team.
 * @param {number} b Liquidity parameter.
 * @param {string} id The team being bought.
 * @param {number} budget Compys to spend.
 * @return {number} The (fractional) number of shares.
 */
export function sharesForBudget(
  q: QVector,
  b: number,
  id: string,
  budget: number,
): number {
  if (budget <= 0) return 0;
  const {a, e} = weights(q, b, id);
  const z = a + e;
  const x = budget / (PRICE_SCALE * b);
  // D = b * ln((Z*e^x - A) / E), evaluated in log space.
  return b * (Math.log(z) + x + Math.log1p(-a / (z * Math.exp(x))) -
    Math.log(e));
}

/**
 * How many shares of team `id` must be sold to receive `proceeds` Compys,
 * as a real number; Infinity when no amount of shares pays that much.
 * Inverts proceeds = S*b*ln((A + E) / (A + E*e^(-D/b))) for D.
 * @param {QVector} q Shares outstanding per team.
 * @param {number} b Liquidity parameter.
 * @param {string} id The team being sold.
 * @param {number} proceeds Compys wanted.
 * @return {number} The (fractional) number of shares.
 */
export function sharesForProceeds(
  q: QVector,
  b: number,
  id: string,
  proceeds: number,
): number {
  if (proceeds <= 0) return 0;
  const {a, e} = weights(q, b, id);
  const inner = ((a + e) * Math.exp(-proceeds / (PRICE_SCALE * b)) - a) / e;
  return inner > 0 ? -b * Math.log(inner) : Infinity;
}

/**
 * What a set of holdings is worth right now: the Compys the market maker
 * would pay to buy all of them back at once. This is the honest mark for a
 * leaderboard. Valuing shares at the last marginal price instead overstates
 * them, because the trader paid the average price along the curve, not the
 * final one. Shares of teams outside q (eliminated ones) are worth 0.
 * @param {QVector} q Shares outstanding per active team.
 * @param {number} b Liquidity parameter.
 * @param {Record<string, number>} holdings Shares held per team.
 * @return {number} The liquidation value in Compys.
 */
export function liquidationValue(
  q: QVector,
  b: number,
  holdings: Record<string, number>,
): number {
  const after: QVector = {...q};
  let any = false;
  for (const [id, shares] of Object.entries(holdings)) {
    if (!(id in q)) continue;
    after[id] -= shares;
    any = true;
  }
  return any ? cost(q, b) - cost(after, b) : 0;
}
