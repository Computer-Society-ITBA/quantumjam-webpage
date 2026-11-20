import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PricePoint } from '@/lib/jamHistory'
import {
  PRICE_SCALE,
  formatPercent,
  isActive,
  type JamMarket,
} from '@/lib/jamMarket'

const HEIGHT = 240
const M = { top: 12, right: 132, bottom: 24, left: 40 }
// The y axis tops out at the first of these above the highest price seen,
// so 20 teams around 5% do not get squashed against the floor.
const Y_TOPS = [10, 20, 30, 40, 50, 60, 80, 100]
const LABELED = 3
const LABEL_GAP = 15

// Focus plus context: up to 20 teams cannot each get a distinguishable hue,
// so every line is a quiet gray, the teams you hold are green (green means
// "you" across the page) and the top teams are named at the line end.
const GRAY = 'color-mix(in oklab, var(--brand-text-faint) 55%, transparent)'
const GREEN = 'var(--brand-green)'

const TIME = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
})

const pctOf = (price: number) =>
  Math.max(0, Math.min(100, (price / PRICE_SCALE) * 100))

/** Each team's win probability over time, as stepped lines. */
export function PriceHistoryChart({
  market,
  history,
  holdings,
}: {
  market: JamMarket
  history: PricePoint[]
  holdings: Record<string, number>
}) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hoverX, setHoverX] = useState<number | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  // On a phone the line-end labels get less room and shorter names.
  const narrow = width < 500
  const nameMax = narrow ? 7 : 14
  const plotW = Math.max(0, width - M.left - (narrow ? 104 : M.right))
  const plotH = HEIGHT - M.top - M.bottom
  const t0 = history[0]?.t ?? 0
  const t1 = history[history.length - 1]?.t ?? 1
  const x = (time: number) =>
    M.left + (t1 > t0 ? ((time - t0) / (t1 - t0)) * plotW : plotW)
  const yTop = useMemo(() => {
    let peak = 0
    for (const point of history) {
      for (const price of Object.values(point.prices)) {
        peak = Math.max(peak, pctOf(price))
      }
    }
    return Y_TOPS.find((top) => top >= peak * 1.08) ?? 100
  }, [history])
  const grid = [0, yTop / 2, yTop]
  const y = (pct: number) => M.top + (1 - pct / yTop) * plotH

  const held = (id: string) => (holdings[id] ?? 0) > 0

  const paths = useMemo(() => {
    if (!plotW || history.length === 0) return []
    return market.teams.map((team) => {
      let d = ''
      history.forEach((point, i) => {
        const px = x(point.t).toFixed(1)
        const py = y(pctOf(point.prices[team.id] ?? 0)).toFixed(1)
        d += i === 0 ? `M${px} ${py}` : `H${px}V${py}`
      })
      return { id: team.id, d }
    })
    // x and y only change with these inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market.teams, history, plotW, yTop])

  const last = history[history.length - 1]
  const labels = useMemo(() => {
    if (!last) return []
    const top = market.teams
      .filter((team) => isActive(market, team.id))
      .map((team) => ({
        team,
        pct: pctOf(last.prices[team.id] ?? 0),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, LABELED)
      .map((entry) => ({ ...entry, ly: y(entry.pct) }))
      .sort((a, b) => a.ly - b.ly)
    // Push overlapping labels apart, top to bottom.
    for (let i = 1; i < top.length; i++) {
      top[i].ly = Math.max(top[i].ly, top[i - 1].ly + LABEL_GAP)
    }
    return top
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, last, plotW, yTop])

  // The crosshair snaps to the last price change at or before the pointer.
  const hover = useMemo(() => {
    if (hoverX === null || history.length === 0 || !plotW) return null
    const time = t0 + ((hoverX - M.left) / plotW) * (t1 - t0)
    let lo = 0
    let hi = history.length - 1
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (history[mid].t <= time) lo = mid
      else hi = mid - 1
    }
    const point = history[lo]
    const rows = market.teams
      .map((team) => ({ team, pct: pctOf(point.prices[team.id] ?? 0) }))
      .sort((a, b) => b.pct - a.pct)
    const shown = rows.filter((row, i) => i < 5 || held(row.team.id))
    return { time: point.t, rows: shown }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverX, history, plotW, market.teams])

  const cutX =
    market.finalistsAtMillis !== null &&
    market.finalistsAtMillis >= t0 &&
    market.finalistsAtMillis <= t1
      ? x(market.finalistsAtMillis)
      : null

  const ownsAny = market.teams.some((team) => held(team.id))
  const tooltipLeft =
    hoverX !== null && hoverX > M.left + plotW / 2
      ? hoverX - 12 - 200
      : (hoverX ?? 0) + 12

  return (
    <section className="border-brand-line bg-brand-panel border p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-[0.95rem] font-semibold">
          {t('jam.history.title')}
        </h2>
        <div className="text-brand-text-dim flex items-center gap-4 text-[0.8rem]">
          {ownsAny && (
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-4"
                style={{ background: GREEN }}
              />
              {t('jam.history.yours')}
            </span>
          )}
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-0.5 w-4"
              style={{ background: GRAY }}
            />
            {t('jam.history.others')}
          </span>
        </div>
      </div>

      <div
        ref={box}
        className="relative"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - r.left
          setHoverX(px >= M.left && px <= M.left + plotW ? px : null)
        }}
        onPointerLeave={() => setHoverX(null)}
      >
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={t('jam.history.aria')}
          className="block"
        >
          {grid.map((g) => (
            <g key={g}>
              <line
                x1={M.left}
                x2={M.left + plotW}
                y1={y(g)}
                y2={y(g)}
                stroke="var(--brand-line)"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(g)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--brand-text-faint)"
              >
                {g}%
              </text>
            </g>
          ))}

          {cutX !== null && (
            <g>
              <line
                x1={cutX}
                x2={cutX}
                y1={M.top}
                y2={M.top + plotH}
                stroke="var(--brand-text-dim)"
                strokeDasharray="3 4"
                strokeWidth={1}
              />
              <text
                x={cutX + 6}
                y={M.top + 10}
                fontSize={11}
                fill="var(--brand-text-dim)"
              >
                {t('jam.history.finalists')}
              </text>
            </g>
          )}

          {paths
            .filter((p) => !held(p.id))
            .map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="none"
                stroke={GRAY}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            ))}
          {paths
            .filter((p) => held(p.id))
            .map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="none"
                stroke={GREEN}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ))}

          {labels.map(({ team, pct, ly }) => (
            <text
              key={team.id}
              x={M.left + plotW + 8}
              y={ly}
              dominantBaseline="middle"
              fontSize={narrow ? 11 : 12}
              fill="var(--brand-text-dim)"
            >
              <tspan fill="var(--foreground)">{formatPercent(pct)}</tspan>{' '}
              {team.name.length > nameMax
                ? `${team.name.slice(0, nameMax - 1)}...`
                : team.name}
            </text>
          ))}

          {history.length > 0 && (
            <>
              <text
                x={M.left}
                y={HEIGHT - 6}
                fontSize={11}
                fill="var(--brand-text-faint)"
              >
                {TIME.format(t0)}
              </text>
              <text
                x={M.left + plotW}
                y={HEIGHT - 6}
                textAnchor="end"
                fontSize={11}
                fill="var(--brand-text-faint)"
              >
                {TIME.format(t1)}
              </text>
            </>
          )}

          {hover && hoverX !== null && (
            <line
              x1={hoverX}
              x2={hoverX}
              y1={M.top}
              y2={M.top + plotH}
              stroke="var(--brand-text-dim)"
              strokeWidth={1}
            />
          )}
        </svg>

        {hover && hoverX !== null && (
          <div
            role="tooltip"
            className="border-brand-line bg-brand-bg pointer-events-none absolute top-2 z-10 w-[200px] border px-3 py-2.5 text-[0.8rem] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            style={{ left: tooltipLeft }}
          >
            <p className="text-brand-text-faint mb-1.5">
              {TIME.format(hover.time)}
            </p>
            <ul className="flex flex-col gap-1">
              {hover.rows.map(({ team, pct }) => (
                <li
                  key={team.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span
                    className={
                      held(team.id)
                        ? 'text-brand-green truncate'
                        : 'text-brand-text-dim truncate'
                    }
                  >
                    {team.name}
                  </span>
                  <span className="text-foreground shrink-0 tabular-nums">
                    {formatPercent(pct)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
