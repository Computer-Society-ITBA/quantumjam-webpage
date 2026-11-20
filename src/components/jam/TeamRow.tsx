import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react'

import { CompysMark } from '@/components/jam/CompysMark'
import type { JamTradeAmount } from '@/lib/jamApi'
import { cn } from '@/lib/utils'
import {
  PRICE_SCALE,
  formatCompys,
  formatPercent,
  formatPrice,
  sharesForBudget,
  sharesForProceeds,
  type JamTeam,
} from '@/lib/jamMarket'

// Shared by the column header and every row so the columns line up:
// rank change, team, chance, your shares, chevron.
export const TEAM_ROW_GRID =
  'grid grid-cols-[2rem_minmax(0,1fr)_auto_1rem] gap-x-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,13rem)_5.5rem_1rem] sm:gap-x-4'

const QUICK_AMOUNTS = [10_000, 100_000]

type OnTrade = (
  teamId: string,
  side: 'buy' | 'sell',
  amount: JamTradeAmount,
) => Promise<boolean>

/** ▲ green / ▼ red for a recent change of position; empty otherwise. */
export function RankDelta({ delta }: { delta: number }) {
  if (!delta) return <span aria-hidden="true" />
  const up = delta > 0
  return (
    <span
      className={cn(
        'animate-in fade-in flex items-center gap-0.5 text-[0.78rem] font-medium tabular-nums',
        up ? 'text-brand-green' : 'text-[#ff5a5a]',
      )}
    >
      {up ? (
        <ArrowUp aria-hidden="true" className="size-3" />
      ) : (
        <ArrowDown aria-hidden="true" className="size-3" />
      )}
      {Math.abs(delta)}
    </span>
  )
}

/**
 * One team in the market list: rank change, name, probability, and your
 * shares. When trading is open the row expands into its buy/sell controls,
 * so only one set of trade controls is ever on screen.
 */
export function TeamRow({
  team,
  price,
  liveQ,
  b,
  cash,
  held,
  canTrade,
  eliminated,
  open,
  onToggle,
  busy,
  onTrade,
  rankDelta,
  rowRef,
}: {
  team: JamTeam
  price: number
  liveQ: Record<string, number>
  b: number
  cash: number
  held: number
  canTrade: boolean
  eliminated: boolean
  open: boolean
  onToggle: () => void
  busy: boolean
  onTrade: OnTrade
  rankDelta: number
  rowRef?: (el: HTMLLIElement | null) => void
}) {
  const { t } = useTranslation()
  const pct = Math.max(0, Math.min(100, (price / PRICE_SCALE) * 100))
  const expandable = canTrade && !eliminated
  const expanded = expandable && open

  return (
    <li ref={rowRef} className={cn(eliminated && 'opacity-45')}>
      <button
        type="button"
        disabled={!expandable}
        aria-expanded={expandable ? expanded : undefined}
        onClick={onToggle}
        className={cn(
          TEAM_ROW_GRID,
          'w-full items-center px-5 py-3.5 text-left',
          expandable && 'enabled:hover:bg-white/[0.025]',
          expanded && 'bg-white/[0.025]',
          !expandable && 'cursor-default',
        )}
      >
        <RankDelta delta={rankDelta} />

        <span className="min-w-0">
          <span className="block truncate text-[0.95rem] font-medium">
            {team.name}
          </span>
          {eliminated ? (
            <span className="text-brand-text-faint block text-[0.78rem]">
              {t('jam.market.eliminated')}
            </span>
          ) : (
            held > 0 && (
              <span className="text-brand-green block text-[0.78rem] tabular-nums sm:hidden">
                {formatCompys(held)} {t('jam.market.sharesUnit')}
              </span>
            )
          )}
        </span>

        <span className="flex items-center gap-3">
          <span className="bg-brand-bg hidden h-1.5 flex-1 overflow-hidden sm:block">
            <span
              className={cn(
                'block h-full transition-[width] duration-700 ease-out',
                held > 0 && !eliminated
                  ? 'bg-brand-green'
                  : 'bg-brand-text-faint/55',
              )}
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="font-display min-w-14 text-right text-[1rem] font-bold tabular-nums">
            {formatPercent(pct)}
          </span>
        </span>

        <span
          className={cn(
            'hidden text-right text-[0.9rem] tabular-nums sm:block',
            held > 0 && !eliminated
              ? 'text-brand-green'
              : 'text-brand-text-faint',
          )}
        >
          {formatCompys(held)}
        </span>

        {expandable ? (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'text-brand-text-faint size-4 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        ) : (
          <span aria-hidden="true" className="size-4" />
        )}
      </button>

      {expanded && (
        <TradeBox
          teamId={team.id}
          price={price}
          liveQ={liveQ}
          b={b}
          cash={cash}
          held={held}
          busy={busy}
          onTrade={onTrade}
        />
      )}
    </li>
  )
}

function TradeBox({
  teamId,
  price,
  liveQ,
  b,
  cash,
  held,
  busy,
  onTrade,
}: {
  teamId: string
  price: number
  liveQ: Record<string, number>
  b: number
  cash: number
  held: number
  busy: boolean
  onTrade: OnTrade
}) {
  const { t } = useTranslation()
  // Kept as text so the field can be emptied while typing a new amount.
  const [amountText, setAmountText] = useState('')

  const amount = /^\d+$/.test(amountText) ? parseInt(amountText, 10) : 0
  // Previews only: the server converts the amount at the executing price.
  const buyShares =
    amount > 0
      ? Math.floor(sharesForBudget(liveQ, b, teamId, Math.min(amount, cash)))
      : 0
  const sellShares =
    amount > 0 && held > 0
      ? Math.min(held, Math.ceil(sharesForProceeds(liveQ, b, teamId, amount)))
      : 0
  const canBuy = amount > 0 && cash > 0 && buyShares >= 1 && !busy
  const canSell = amount > 0 && sellShares >= 1 && !busy

  const submit = async (side: 'buy' | 'sell', trade: JamTradeAmount) => {
    const ok = await onTrade(teamId, side, trade)
    if (ok) setAmountText('')
  }

  const chip = (label: string, value: number, key: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setAmountText(String(Math.max(0, Math.floor(value))))}
      className={cn(
        'h-10 shrink-0 border px-2.5 text-[0.8rem] tabular-nums transition-colors',
        amountText === String(Math.floor(value)) && amount > 0
          ? 'border-brand-text-dim text-foreground'
          : 'border-brand-line text-brand-text-dim hover:text-foreground',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="bg-white/[0.025] px-5 pt-1 pb-5">
      <p className="text-brand-text-dim mb-3 flex flex-wrap items-center gap-1.5 text-[0.85rem]">
        {t('jam.market.priceNow')}
        <span className="text-foreground tabular-nums">
          {formatPrice(price)}
        </span>
        <CompysMark />
      </p>

      <div className="flex items-stretch gap-2">
        <div className="border-brand-line bg-brand-bg focus-within:border-brand-text-dim flex h-10 min-w-0 flex-1 items-center gap-2 border px-3">
          <input
            type="text"
            inputMode="numeric"
            value={amountText}
            placeholder={t('jam.market.amountPlaceholder')}
            onChange={(e) =>
              setAmountText(e.target.value.replace(/\D/g, '').slice(0, 12))
            }
            className="min-w-0 flex-1 bg-transparent text-[0.95rem] tabular-nums focus:outline-none"
            aria-label={t('jam.market.amountLabel')}
          />
          <CompysMark />
        </div>
        {QUICK_AMOUNTS.map((n) => chip(`${n / 1000}k`, n, String(n)))}
        {chip(t('jam.market.allIn'), cash, 'all-in')}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!canBuy}
          onClick={() => void submit('buy', { compys: Math.min(amount, cash) })}
          className="bg-foreground text-brand-bg hover:bg-brand-green disabled:hover:bg-foreground flex h-11 items-center justify-between gap-2 px-3.5 transition-colors disabled:opacity-35"
        >
          <span className="text-[0.9rem] font-semibold">
            {t('jam.market.buy')}
          </span>
          {buyShares > 0 && (
            <span className="text-[0.8rem] tabular-nums">
              {t('jam.market.aboutShares', {
                count: buyShares,
                shares: formatCompys(buyShares),
              })}
            </span>
          )}
        </button>
        <button
          type="button"
          disabled={!canSell}
          onClick={() => void submit('sell', { compys: amount })}
          className="border-brand-line hover:border-brand-text-faint flex h-11 items-center justify-between gap-2 border px-3.5 transition-colors disabled:opacity-35"
        >
          <span className="text-[0.9rem] font-semibold">
            {t('jam.market.sell')}
          </span>
          {sellShares > 0 && (
            <span className="text-brand-text-dim text-[0.8rem] tabular-nums">
              {t('jam.market.aboutShares', {
                count: sellShares,
                shares: formatCompys(sellShares),
              })}
            </span>
          )}
        </button>
      </div>

      <div className="text-brand-text-dim mt-3 flex items-center justify-between text-[0.82rem]">
        <span className="tabular-nums">
          {t('jam.market.youHold')}{' '}
          <span className="text-foreground">
            {formatCompys(held)} {t('jam.market.sharesUnit')}
          </span>
        </span>
        {held > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit('sell', { shares: held })}
            className="hover:text-foreground underline-offset-4 hover:underline disabled:opacity-35"
          >
            {t('jam.market.sellAll')}
          </button>
        )}
      </div>
    </div>
  )
}
