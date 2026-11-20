import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { CompysMark } from '@/components/jam/CompysMark'
import { RankDelta } from '@/components/jam/TeamRow'
import { useRankMotion } from '@/hooks/useRankMotion'
import { cn } from '@/lib/utils'
import {
  formatCompys,
  netWorth,
  type JamMarket,
  type JamPlayer,
} from '@/lib/jamMarket'

export function Leaderboard({
  players,
  market,
  meId,
  title,
}: {
  players: JamPlayer[]
  market: Pick<JamMarket, 'q' | 'b' | 'finalists'>
  meId: string | null
  title: string
}) {
  const { t } = useTranslation()

  const ranked = useMemo(
    () =>
      players
        .map((p) => ({ ...p, worth: netWorth(p.cash, p.holdings, market) }))
        .sort((a, b) => b.worth - a.worth),
    [players, market],
  )
  const motion = useRankMotion(ranked.map((p) => p.playerId))

  return (
    <section className="border-brand-line bg-brand-panel border">
      <h2 className="px-5 pt-4 pb-2 text-[0.95rem] font-semibold">{title}</h2>

      {ranked.length === 0 ? (
        <p className="text-brand-text-dim px-5 py-8 text-center text-[0.85rem]">
          {t('jam.leaderboard.empty')}
        </p>
      ) : (
        <ol className="relative pb-2">
          {ranked.map((p, i) => {
            const isMe = p.playerId === meId
            return (
              <li
                key={p.playerId}
                ref={motion.ref(p.playerId)}
                className={cn(
                  'grid grid-cols-[1.5rem_2rem_1fr_auto] items-center gap-2 px-5 py-2.5',
                  isMe && 'bg-brand-green/[0.07]',
                )}
              >
                <span
                  className={cn(
                    'font-display text-[0.9rem] font-bold tabular-nums',
                    i === 0 ? 'text-foreground' : 'text-brand-text-faint',
                  )}
                >
                  {i + 1}
                </span>
                <RankDelta delta={motion.deltaOf(p.playerId)} />
                <span className="min-w-0 text-[0.92rem] break-words">
                  {p.displayName || t('jam.leaderboard.anon')}
                  {isMe && (
                    <span className="text-brand-green ml-2 text-[0.8rem]">
                      ({t('jam.leaderboard.you')})
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-end gap-1.5 text-[0.92rem] tabular-nums">
                  {formatCompys(p.worth)}
                  <CompysMark />
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
