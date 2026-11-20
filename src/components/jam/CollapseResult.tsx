import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CompysMark } from '@/components/jam/CompysMark'
import {
  formatCompys,
  netWorth,
  type JamMarket,
  type JamPlayer,
} from '@/lib/jamMarket'

/** The settled market: who won the Jam, who won the exchange, and you. */
export function CollapseResult({
  market,
  players,
  meId,
}: {
  market: JamMarket
  players: JamPlayer[]
  meId: string | null
}) {
  const { t } = useTranslation()
  const winnerId = market.podium?.[0] ?? null

  const champion = useMemo(() => {
    let best: (JamPlayer & { worth: number }) | null = null
    for (const p of players) {
      const worth = netWorth(p.cash, p.holdings, market)
      if (!best || worth > best.worth) best = { ...p, worth }
    }
    return best
  }, [players, market])

  const teamName = (id: string) =>
    market.teams.find((team) => team.id === id)?.name ?? id
  const championIsMe = champion !== null && champion.playerId === meId

  return (
    <section className="border-brand-line bg-brand-panel border p-6 sm:p-8">
      <h2 className="font-display text-[1.7rem] leading-tight font-extrabold">
        {t('jam.collapse.title')}
      </h2>
      {winnerId && (
        <p className="text-brand-text-dim mt-2 text-[1rem]">
          {t('jam.collapse.wonBy')}{' '}
          <span className="text-foreground font-semibold">
            {teamName(winnerId)}
          </span>
        </p>
      )}

      {champion && (
        <div className="mt-8">
          <p className="text-brand-text-dim text-[0.9rem]">
            {t('jam.collapse.champion')}
          </p>
          <p className="font-display mt-1 text-[1.5rem] leading-tight font-extrabold">
            {champion.displayName || t('jam.leaderboard.anon')}
            {championIsMe && (
              <span className="text-brand-green ml-2 font-sans text-[0.9rem] font-normal">
                ({t('jam.leaderboard.you')})
              </span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[1.05rem] tabular-nums">
            {formatCompys(champion.worth)}
            <CompysMark />
          </p>
        </div>
      )}
    </section>
  )
}
