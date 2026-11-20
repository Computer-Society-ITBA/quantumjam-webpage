import {HttpsError} from "firebase-functions/https";
import {
  Query,
  Timestamp,
  type DocumentData,
} from "firebase-admin/firestore";

import {db} from "../admin";
import {collections, JAM_MARKET_DOC} from "../lib/collections";
import {
  PRICE_SCALE,
  activeQ,
  liquidationValue,
  marketPrices,
  prices,
  type QVector,
} from "./lmsr";
import {readMarket, type JamMarket, type JamTeam} from "./store";

const DEFAULT_B = 4000;
const DEFAULT_STARTING_CASH = 1_000_000;
// Winner-take-all: only the champion's shares pay, at PRICE_SCALE each.
const DEFAULT_PAYOUTS = [PRICE_SCALE];
const MAX_TEAMS = 20;
const TEAM_NAME_MAX = 40;
const DELETE_BATCH = 400;

export type JamLeaderRow = {
  playerId: string;
  displayName: string;
  cash: number;
  holdings: Record<string, number>;
  netWorth: number;
};

export type JamAdminState = {
  market: JamMarket | null;
  players: JamLeaderRow[];
  fetchedAt: string;
};

/**
 * Cleans a single team name from admin input.
 * @param {unknown} raw The raw name.
 * @return {string} The trimmed name, empty when unusable.
 */
function cleanTeamName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, TEAM_NAME_MAX);
}

/**
 * Reads the whole market state plus the current leaderboard, for the admin
 * panel. Net worth values holdings at what selling them all would pay.
 * @return {Promise<JamAdminState>} The market and ranked players.
 */
export async function handleJamRead(): Promise<JamAdminState> {
  const market = await readMarket();
  const snap = await db.collection(collections.jamPlayers).get();
  const players: JamLeaderRow[] = snap.docs.map((doc) => {
    const data = doc.data();
    const holdings =
      (data.holdings as Record<string, number> | undefined) ?? {};
    const cash = (data.cash as number | undefined) ?? 0;
    const worth = market ?
      cash + liquidationValue(
        activeQ(market.q, market.finalists ?? null),
        market.b,
        holdings,
      ) :
      cash;
    return {
      playerId: doc.id,
      displayName: (data.displayName as string | undefined) ?? "",
      cash,
      holdings,
      netWorth: Math.round(worth),
    };
  });
  players.sort((a, b) => b.netWorth - a.netWorth);
  return {market, players, fetchedAt: new Date().toISOString()};
}

/**
 * Creates or replaces the market document from a list of team names,
 * resetting shares and prices. Does not touch existing players: use reset
 * for that. Allowed only before the market opens.
 * @param {unknown} body The request body {teams, b?, startingCash?}.
 * @return {Promise<{ok: true}>} On success.
 */
export async function handleJamSetup(
  body: unknown,
): Promise<{ok: true}> {
  const existing = await readMarket();
  if (existing && existing.phase !== "setup") {
    throw new HttpsError(
      "failed-precondition",
      "The market is already running. Reset it first.",
    );
  }

  const data = body as {
    teams?: unknown;
    b?: unknown;
    startingCash?: unknown;
  } | null;
  const names = Array.isArray(data?.teams) ?
    data!.teams.map(cleanTeamName).filter((name) => name.length > 0) :
    [];
  if (names.length < 2 || names.length > MAX_TEAMS) {
    throw new HttpsError(
      "invalid-argument",
      `Provide between 2 and ${MAX_TEAMS} team names.`,
    );
  }

  const b =
    typeof data?.b === "number" && data.b > 0 ? data.b : DEFAULT_B;
  const startingCash =
    typeof data?.startingCash === "number" && data.startingCash > 0 ?
      Math.floor(data.startingCash) :
      DEFAULT_STARTING_CASH;

  const teams: JamTeam[] = names.map((name, i) => ({id: `t${i}`, name}));
  const q: QVector = {};
  for (const team of teams) q[team.id] = 0;

  const now = Timestamp.now();
  const market: JamMarket = {
    phase: "setup",
    b,
    startingCash,
    payouts: DEFAULT_PAYOUTS,
    teams,
    q,
    prices: prices(q, b),
    finalists: null,
    finalistsAt: null,
    podium: null,
    openedAt: null,
    frozenAt: null,
    settledAt: null,
    updatedAt: now,
  };
  await db
    .collection(collections.jamMarket)
    .doc(JAM_MARKET_DOC)
    .set(market);
  return {ok: true};
}

/**
 * Moves the market to "open" (trading) or "frozen" (trading stopped).
 * @param {"open" | "frozen"} phase The target phase.
 * @return {Promise<{ok: true}>} On success.
 */
export async function handleJamPhase(
  phase: "open" | "frozen",
): Promise<{ok: true}> {
  const market = await readMarket();
  if (!market) throw new HttpsError("failed-precondition", "No market.");
  const canOpen = market.phase === "setup" || market.phase === "frozen";
  if (phase === "open" && !canOpen) {
    throw new HttpsError("failed-precondition", "Cannot open from here.");
  }
  if (phase === "frozen" && market.phase !== "open") {
    throw new HttpsError("failed-precondition", "Cannot freeze from here.");
  }
  const now = Timestamp.now();
  const patch: DocumentData = {phase, updatedAt: now};
  if (phase === "open" && !market.openedAt) patch.openedAt = now;
  if (phase === "frozen") patch.frozenAt = now;
  await db
    .collection(collections.jamMarket)
    .doc(JAM_MARKET_DOC)
    .update(patch);
  return {ok: true};
}

/**
 * Sets the finalists. Every other team collapses to 0 and can no longer be
 * traded, and the finalists split the whole probability in proportion to
 * their current weights (each finalist's weight over the finalists' total).
 * Can be changed again until the market settles; shares are never touched,
 * so restoring a team brings its price back exactly.
 * @param {unknown} body The request body {teamIds: string[]}.
 * @return {Promise<{ok: true}>} On success.
 */
export async function handleJamFinalists(
  body: unknown,
): Promise<{ok: true}> {
  const market = await readMarket();
  if (!market) throw new HttpsError("failed-precondition", "No market.");
  if (market.phase === "settled") {
    throw new HttpsError("failed-precondition", "The market is settled.");
  }
  const data = body as {teamIds?: unknown} | null;
  const valid = new Set(market.teams.map((team) => team.id));
  const picked = Array.isArray(data?.teamIds) ?
    data!.teamIds.filter((id): id is string => typeof id === "string") :
    [];
  // Keep the market's own team order, whatever order the ids came in.
  const finalists = market.teams
    .map((team) => team.id)
    .filter((id) => picked.includes(id));
  if (finalists.length < 2 || picked.some((id) => !valid.has(id))) {
    throw new HttpsError("invalid-argument", "Pick at least two finalists.");
  }
  const now = Timestamp.now();
  await db
    .collection(collections.jamMarket)
    .doc(JAM_MARKET_DOC)
    .update({
      finalists,
      finalistsAt: now,
      prices: marketPrices(market.q, market.b, finalists),
      updatedAt: now,
    });
  return {ok: true};
}

/**
 * Settles the market: collapses to the real winner. Each share of the
 * winning team pays PRICE_SCALE Compys and every other share pays nothing,
 * which is exactly the contract the prices traded on (the probability of
 * finishing first). The final net worth is recorded as each player's cash.
 * Allowed from the frozen phase.
 * @param {unknown} body The request body {winner: string}.
 * @return {Promise<object>} The result with the number of players settled.
 */
export async function handleJamSettle(
  body: unknown,
): Promise<{ok: true; settled: number}> {
  const market = await readMarket();
  if (!market) throw new HttpsError("failed-precondition", "No market.");
  if (market.phase !== "frozen") {
    throw new HttpsError(
      "failed-precondition",
      "Freeze the market before settling.",
    );
  }

  const data = body as {winner?: unknown} | null;
  const winner = typeof data?.winner === "string" ? data.winner : "";
  if (!market.teams.some((team) => team.id === winner)) {
    throw new HttpsError("invalid-argument", "Pick the winning team.");
  }
  if (market.finalists && !market.finalists.includes(winner)) {
    throw new HttpsError(
      "invalid-argument",
      "The winner must be one of the finalists.",
    );
  }

  const payoutOf = (teamId: string): number =>
    teamId === winner ? PRICE_SCALE : 0;

  const snap = await db.collection(collections.jamPlayers).get();
  let settled = 0;
  for (let i = 0; i < snap.docs.length; i += DELETE_BATCH) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + DELETE_BATCH)) {
      const player = doc.data();
      const holdings =
        (player.holdings as Record<string, number> | undefined) ?? {};
      let worth = (player.cash as number | undefined) ?? 0;
      for (const [teamId, shares] of Object.entries(holdings)) {
        worth += shares * payoutOf(teamId);
      }
      batch.update(doc.ref, {
        cash: worth,
        holdings: {},
        settledNetWorth: worth,
        updatedAt: Timestamp.now(),
      });
      settled++;
    }
    await batch.commit();
  }

  // Collapse the on-screen wavefunction onto the winner: 100 for it, 0 for
  // everyone else. payouts is rewritten too, so a market created under the
  // old podium rules still displays the payout it actually made.
  const collapsed: Record<string, number> = {};
  for (const team of market.teams) collapsed[team.id] = payoutOf(team.id);
  await db
    .collection(collections.jamMarket)
    .doc(JAM_MARKET_DOC)
    .update({
      phase: "settled",
      podium: [winner],
      payouts: [PRICE_SCALE],
      prices: collapsed,
      settledAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  return {ok: true, settled};
}

/**
 * Deletes every document in a collection, in batches. Used only by reset.
 * @param {Query} query The collection query.
 * @return {Promise<void>} Resolves once the collection is empty.
 */
async function deleteAll(query: Query): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await query.limit(DELETE_BATCH).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
  }
}

/**
 * Wipes all players, secrets, trades and verifications and returns the
 * market to the "setup" phase with zeroed shares. For use before the event
 * (e.g. clearing a test run), never mid-game.
 * @return {Promise<{ok: true}>} On success.
 */
export async function handleJamReset(): Promise<{ok: true}> {
  await Promise.all([
    deleteAll(db.collection(collections.jamPlayers)),
    deleteAll(db.collection(collections.jamPlayerSecrets)),
    deleteAll(db.collection(collections.jamTrades)),
    deleteAll(db.collection(collections.jamVerifications)),
  ]);
  const market = await readMarket();
  if (market) {
    const q: QVector = {};
    for (const team of market.teams) q[team.id] = 0;
    await db
      .collection(collections.jamMarket)
      .doc(JAM_MARKET_DOC)
      .update({
        phase: "setup",
        q,
        prices: prices(q, market.b),
        finalists: null,
        finalistsAt: null,
        podium: null,
        openedAt: null,
        frozenAt: null,
        settledAt: null,
        updatedAt: Timestamp.now(),
      });
  }
  return {ok: true};
}

/**
 * Dispatches a POST under /api/admin/jam/<action>. The caller has already
 * authenticated with the backoffice credentials.
 * @param {string} action The sub-path after jam/.
 * @param {unknown} body The parsed JSON body.
 * @return {Promise<object>} The JSON response payload.
 */
export async function handleJamAdminPost(
  action: string,
  body: unknown,
): Promise<object> {
  if (action === "setup") return handleJamSetup(body);
  if (action === "open") return handleJamPhase("open");
  if (action === "freeze") return handleJamPhase("frozen");
  if (action === "finalists") return handleJamFinalists(body);
  if (action === "settle") return handleJamSettle(body);
  if (action === "reset") return handleJamReset();
  throw new HttpsError("not-found", "Unknown jam action.");
}
