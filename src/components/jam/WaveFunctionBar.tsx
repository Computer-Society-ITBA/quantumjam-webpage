import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CompysMark } from '@/components/jam/CompysMark'
import { cn } from '@/lib/utils'
import {
  PRICE_SCALE,
  formatCompys,
  formatPrice,
  type JamTeam,
} from '@/lib/jamMarket'

/**
 * The market "wavefunction": one bar split by every team's probability,
 * always summing to 100%. Built for ~20 teams, so segments are not told
 * apart by hue (20 distinguishable brand colors do not exist). They
 * alternate two quiet grays; teams you hold are green (green means "you"
 * across the page); hover or tap a segment for its details.
 */
export function WaveFunctionBar({
  teams,
  prices,
  holdings,
}: {
  teams: JamTeam[]
  prices: Record<string, number>
  holdings: Record<string, number>
}) {
  const { t } = useTranslation()
  const [active, setActive] = useState<string | null>(null)

  const segments = useMemo(() => {
    const sorted = [...teams].sort(
      (a, b) => (prices[b.id] ?? 0) - (prices[a.id] ?? 0),
    )
    let start = 0
    return sorted.map((team) => {
      const price = prices[team.id] ?? 0
      const pct = Math.max(0, Math.min(100, (price / PRICE_SCALE) * 100))
      const segment = { team, price, pct, start }
      start += pct
      return segment
    })
  }, [teams, prices])

  const shown = segments.find((s) => s.team.id === active)
  const shownHeld = shown ? (holdings[shown.team.id] ?? 0) : 0

  return (
    <div className="flex items-center gap-3">
      <span
        title={t('jam.wavefunction')}
        className="text-brand-text-faint shrink-0 text-[0.85rem] leading-none"
      >
        |Ψ⟩
      </span>

      <div className="relative flex-1" onMouseLeave={() => setActive(null)}>
        <div className="flex h-4 w-full overflow-hidden">
          {segments.map(({ team, pct }, i) => {
            const isActive = team.id === active
            const held = (holdings[team.id] ?? 0) > 0
            return (
              <button
                key={team.id}
                type="button"
                tabIndex={-1}
                aria-label={`${team.name} ${pct.toFixed(1)}%`}
                onMouseEnter={() => setActive(team.id)}
                onClick={() =>
                  setActive((current) => (current === team.id ? null : team.id))
                }
                className={cn(
                  'border-brand-bg h-full border-r transition-[width,background-color] duration-500 ease-out last:border-r-0',
                  isActive
                    ? 'bg-foreground'
                    : held
                      ? 'bg-brand-green'
                      : i % 2 === 0
                        ? 'bg-brand-text-faint/45'
                        : 'bg-brand-text-faint/25',
                )}
                style={{ width: `${pct}%` }}
              />
            )
          })}
        </div>

        {shown && (
          <div
            role="tooltip"
            className="border-brand-line bg-brand-panel pointer-events-none absolute bottom-full z-20 mb-2 -translate-x-1/2 border px-3.5 py-2.5 whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            style={{
              left: `clamp(6rem, ${shown.start + shown.pct / 2}%, calc(100% - 6rem))`,
            }}
          >
            <p className="font-display text-[0.92rem] leading-tight font-bold">
              {shown.team.name}
            </p>
            <p className="text-brand-text-dim mt-1.5 flex items-center gap-1.5 text-[0.8rem] tabular-nums">
              <span className="text-foreground">
                {formatPrice(shown.price)}
              </span>
              <CompysMark />
              <span className="text-brand-text-faint">
                / {t('jam.market.share')}
              </span>
            </p>
            <p className="text-brand-text-dim mt-0.5 text-[0.8rem] tabular-nums">
              {t('jam.market.youHold')}{' '}
              <span
                className={
                  shownHeld > 0 ? 'text-brand-green' : 'text-brand-text-faint'
                }
              >
                {formatCompys(shownHeld)} {t('jam.market.sharesUnit')}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
