import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import {
  JAM_MARKET_COLLECTION,
  JAM_MARKET_DOC,
  JAM_PLAYERS_COLLECTION,
  JAM_TRADES_COLLECTION,
  parseMarket,
  type JamMarket,
  type JamPlayer,
  type JamTrade,
} from '@/lib/jamMarket'

type MarketState = { loading: boolean; market: JamMarket | null }

/** Live subscription to the single market document. */
export function useJamMarket(): MarketState {
  const [state, setState] = useState<MarketState>({
    loading: true,
    market: null,
  })

  useEffect(() => {
    const ref = doc(db, JAM_MARKET_COLLECTION, JAM_MARKET_DOC)
    return onSnapshot(
      ref,
      (snap) => setState({ loading: false, market: parseMarket(snap.data()) }),
      () => setState({ loading: false, market: null }),
    )
  }, [])

  return state
}

/** Live subscription to every player, for the leaderboard. */
export function useJamPlayers(): JamPlayer[] {
  const [players, setPlayers] = useState<JamPlayer[]>([])

  useEffect(() => {
    const ref = collection(db, JAM_PLAYERS_COLLECTION)
    return onSnapshot(
      ref,
      (snap) => {
        setPlayers(
          snap.docs.map((d) => {
            const data = d.data()
            const holdings =
              (data.holdings as Record<string, number> | undefined) ?? {}
            return {
              playerId: d.id,
              displayName: (data.displayName as string | undefined) ?? '',
              cash: (data.cash as number | undefined) ?? 0,
              holdings,
            }
          }),
        )
      },
      () => setPlayers([]),
    )
  }, [])

  return players
}

/** Live subscription to the most recent trades, newest first. */
export function useJamTrades(max = 12): JamTrade[] {
  const [trades, setTrades] = useState<JamTrade[]>([])

  useEffect(() => {
    const ref = query(
      collection(db, JAM_TRADES_COLLECTION),
      orderBy('at', 'desc'),
      fbLimit(max),
    )
    return onSnapshot(
      ref,
      (snap) => {
        setTrades(
          snap.docs.map((d) => {
            const data = d.data()
            const at = data.at as Timestamp | undefined
            return {
              id: d.id,
              displayName: (data.displayName as string | undefined) ?? '',
              teamId: (data.teamId as string | undefined) ?? '',
              teamName: (data.teamName as string | undefined) ?? '',
              side: data.side === 'sell' ? 'sell' : 'buy',
              shares: (data.shares as number | undefined) ?? 0,
              compys: (data.compys as number | undefined) ?? 0,
              atMillis: at ? at.toMillis() : 0,
            }
          }),
        )
      },
      () => setTrades([]),
    )
  }, [max])

  return trades
}

export type JamTradePoint = {
  teamId: string
  side: 'buy' | 'sell'
  shares: number
  atMillis: number
}

/** Live subscription to every trade, oldest first, for the price history. */
export function useJamTradeHistory(): JamTradePoint[] {
  const [trades, setTrades] = useState<JamTradePoint[]>([])

  useEffect(() => {
    const ref = query(
      collection(db, JAM_TRADES_COLLECTION),
      orderBy('at', 'asc'),
    )
    return onSnapshot(
      ref,
      (snap) => {
        setTrades(
          snap.docs.map((d) => {
            const data = d.data()
            const at = data.at as Timestamp | undefined
            return {
              teamId: (data.teamId as string | undefined) ?? '',
              side: data.side === 'sell' ? 'sell' : 'buy',
              shares: (data.shares as number | undefined) ?? 0,
              atMillis: at ? at.toMillis() : 0,
            }
          }),
        )
      },
      () => setTrades([]),
    )
  }, [])

  return trades
}
