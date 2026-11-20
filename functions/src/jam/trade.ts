import {onCall, HttpsError} from "firebase-functions/https";
import {Timestamp} from "firebase-admin/firestore";

import {db} from "../admin";
import {collections, JAM_MARKET_DOC} from "../lib/collections";
import {
  activeQ,
  marketPrices,
  sharesForBudget,
  sharesForProceeds,
  tradeCost,
  type QVector,
} from "./lmsr";
import {requireSession} from "./auth";
import type {JamMarket} from "./store";

// Guard rails against absurd requests, never a real-play limit.
const MAX_SHARES_PER_TRADE = 1_000_000_000;
const MAX_COMPYS_PER_TRADE = 1_000_000_000_000;

type Side = "buy" | "sell";

type TradeRequest = {
  id: string;
  token: string;
  teamId: string;
  side: Side;
  // Exactly one of these is set: a share count, or a Compys amount (spend
  // that much when buying, receive about that much when selling).
  shares: number | null;
  compys: number | null;
};

/**
 * Validates and coerces the trade request shape.
 * @param {unknown} data Raw onCall data.
 * @return {TradeRequest} The validated trade request.
 */
function readTrade(data: unknown): TradeRequest {
  const body = data as {
    playerId?: unknown;
    sessionToken?: unknown;
    teamId?: unknown;
    side?: unknown;
    shares?: unknown;
    compys?: unknown;
  } | null;
  const id = typeof body?.playerId === "string" ? body.playerId : "";
  const token = typeof body?.sessionToken === "string" ? body.sessionToken : "";
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";
  const side = body?.side === "buy" || body?.side === "sell" ? body.side : null;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : null;
  const shares = num(body?.shares);
  const compys = num(body?.compys);
  if (!teamId || !side) {
    throw new HttpsError("invalid-argument", "A team and side are required.");
  }
  if ((shares === null) === (compys === null)) {
    throw new HttpsError("invalid-argument", "Send shares or compys.");
  }
  if (shares !== null && (shares < 1 || shares > MAX_SHARES_PER_TRADE)) {
    throw new HttpsError("invalid-argument", "Invalid share amount.");
  }
  if (compys !== null && (compys < 1 || compys > MAX_COMPYS_PER_TRADE)) {
    throw new HttpsError("invalid-argument", "Invalid Compys amount.");
  }
  return {id, token, teamId, side, shares, compys};
}

/**
 * The most whole shares a budget buys, given that a buy is charged its
 * cost rounded up (and at least 1 Compy).
 * @param {QVector} q Shares outstanding per active team.
 * @param {number} b Liquidity parameter.
 * @param {string} teamId The team being bought.
 * @param {number} budget Compys available to spend.
 * @return {number} Whole shares, possibly 0.
 */
function maxSharesFor(
  q: QVector,
  b: number,
  teamId: string,
  budget: number,
): number {
  const charge = (n: number) =>
    Math.max(1, Math.ceil(tradeCost(q, b, teamId, n)));
  let lo = 0;
  let hi = Math.min(
    MAX_SHARES_PER_TRADE,
    Math.max(0, Math.floor(sharesForBudget(q, b, teamId, budget))) + 1,
  );
  // Binary search: the largest n whose rounded-up cost still fits.
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (charge(mid) <= budget) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export const jamTrade = onCall(async (request) => {
  const trade = readTrade(request.data);
  const {id, token, teamId, side} = trade;
  // Proves the caller owns this player before any balance is touched.
  await requireSession(id, token);

  const marketRef = db.collection(collections.jamMarket).doc(JAM_MARKET_DOC);
  const playerRef = db.collection(collections.jamPlayers).doc(id);
  const tradeRef = db.collection(collections.jamTrades).doc();

  const result = await db.runTransaction(async (tx) => {
    const [marketSnap, playerSnap] = await Promise.all([
      tx.get(marketRef),
      tx.get(playerRef),
    ]);
    const market = marketSnap.data() as JamMarket | undefined;
    const player = playerSnap.data();
    if (!market) throw new HttpsError("failed-precondition", "No market.");
    if (!player) throw new HttpsError("unauthenticated", "Sign in to play.");
    if (market.phase !== "open") {
      throw new HttpsError("failed-precondition", "The market is closed.");
    }
    if (!market.teams.some((team) => team.id === teamId)) {
      throw new HttpsError("invalid-argument", "Unknown team.");
    }
    const finalists = market.finalists ?? null;
    if (finalists && !finalists.includes(teamId)) {
      throw new HttpsError(
        "failed-precondition",
        "This team is out of the final and cannot be traded.",
      );
    }

    const q: QVector = {...market.q};
    // Every price and cost is computed over the active teams only.
    const live = activeQ(q, finalists);
    const cash = (player.cash as number | undefined) ?? 0;
    const holdings = {
      ...((player.holdings as Record<string, number> | undefined) ?? {}),
    };
    const held = holdings[teamId] ?? 0;

    let shares: number;
    if (trade.shares !== null) {
      shares = trade.shares;
    } else if (side === "buy") {
      shares = maxSharesFor(
        live,
        market.b,
        teamId,
        Math.min(trade.compys as number, cash),
      );
    } else {
      const needed = sharesForProceeds(
        live,
        market.b,
        teamId,
        trade.compys as number,
      );
      shares = Math.min(held, Math.ceil(needed));
    }
    if (shares < 1) {
      throw new HttpsError("failed-precondition", "Amount too small.");
    }

    let nextCash: number;
    let paid: number;
    if (side === "buy") {
      paid = Math.max(1, Math.ceil(tradeCost(live, market.b, teamId, shares)));
      if (paid > cash) {
        throw new HttpsError("failed-precondition", "Not enough Compys.");
      }
      nextCash = cash - paid;
      q[teamId] = (q[teamId] ?? 0) + shares;
      holdings[teamId] = held + shares;
    } else {
      if (held < shares) {
        throw new HttpsError("failed-precondition", "Not enough shares.");
      }
      const cost = tradeCost(live, market.b, teamId, -shares);
      paid = -Math.max(0, Math.floor(-cost));
      nextCash = cash - paid;
      q[teamId] = (q[teamId] ?? 0) - shares;
      holdings[teamId] = held - shares;
      if (holdings[teamId] === 0) delete holdings[teamId];
    }

    const now = Timestamp.now();
    const nextPrices = marketPrices(q, market.b, finalists);
    tx.update(marketRef, {q, prices: nextPrices, updatedAt: now});
    tx.update(playerRef, {cash: nextCash, holdings, updatedAt: now});
    tx.set(tradeRef, {
      playerId: id,
      displayName: (player.displayName as string | undefined) ?? "",
      teamId,
      teamName: market.teams.find((team) => team.id === teamId)?.name ?? "",
      side,
      shares,
      // Compys paid (buy) or received (sell, stored as a positive number).
      compys: Math.abs(paid),
      price: nextPrices[teamId],
      // Enough state to audit or replay the trade on its own.
      cashBefore: cash,
      cashAfter: nextCash,
      heldBefore: held,
      heldAfter: holdings[teamId] ?? 0,
      qAfter: q,
      pricesAfter: nextPrices,
      at: now,
    });

    return {cash: nextCash, holdings, shares, compys: Math.abs(paid)};
  });

  return {ok: true, ...result};
});
