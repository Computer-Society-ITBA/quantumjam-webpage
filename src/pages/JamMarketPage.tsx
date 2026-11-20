import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { CollapseResult } from '@/components/jam/CollapseResult'
import { Compy3D } from '@/components/jam/Compy3D'
import { CompysMark } from '@/components/jam/CompysMark'
import { JamAuth } from '@/components/jam/JamAuth'
import { Leaderboard } from '@/components/jam/Leaderboard'
import { PriceHistoryChart } from '@/components/jam/PriceHistoryChart'
import { TEAM_ROW_GRID, TeamRow } from '@/components/jam/TeamRow'
import { WaveFunctionBar } from '@/components/jam/WaveFunctionBar'
import { SplitText } from '@/components/landing/SplitText'
import {
  useJamMarket,
  useJamPlayers,
  useJamTradeHistory,
  type JamTradePoint,
} from '@/hooks/useJam'
import { useRankMotion } from '@/hooks/useRankMotion'
import {
  clearSession,
  jamErrorCode,
  jamTrade,
  jamValidateSession,
  loadSession,
  type JamSession,
  type JamTradeAmount,
} from '@/lib/jamApi'
import { buildPriceHistory } from '@/lib/jamHistory'
import {
  activeQ,
  formatCompys,
  isActive,
  netWorth,
  type JamMarket,
  type JamPhase,
  type JamPlayer,
} from '@/lib/jamMarket'

const PAGE_X = 'px-[clamp(16px,5vw,64px)]'
const DISPLAY_FONT = { fontVariationSettings: '"wdth" 104, "wght" 800' }
export const JAM_RULES_PATH = '/jam/reglas'

type OnTrade = (
  teamId: string,
  side: 'buy' | 'sell',
  amount: JamTradeAmount,
) => Promise<boolean>

/** A quiet live dot while open; "frozen" once trading stops. */
function StatusTag({ phase }: { phase: JamPhase }) {
  const { t } = useTranslation()
  if (phase === 'open') {
    return (
      <span className="text-brand-green inline-flex items-center gap-2 text-[0.85rem]">
        <span className="bg-brand-green animate-pulse-dot size-2 rounded-full" />
        {t('jam.live')}
      </span>
    )
  }
  if (phase === 'frozen') {
    return (
      <span className="text-brand-cyan text-[0.85rem]">
        {t('jam.phase.frozen')}
      </span>
    )
  }
  return null
}

/**
 * "Bolsa de Compys", led by the spinning 3D coin. In the hero everything is
 * one centered stack, coin on top, matching the event slide: the cyan and
 * magenta interference split (the site's quantum motif, so no subtitle is
 * needed) with the coin word in green. The top bar gets one compact line.
 */
export function BolsaTitle({ size }: { size: 'hero' | 'bar' }) {
  const { t } = useTranslation()
  const before = t('jam.titleBefore')
  const coin = t('jam.titleCoin')
  const after = t('jam.titleAfter')

  if (size === 'bar') {
    return (
      <h1
        aria-label={t('jam.title')}
        className="font-display flex items-center gap-[0.4em] text-[clamp(1.25rem,3vw,1.6rem)] leading-none font-extrabold tracking-[-0.01em] uppercase"
        style={DISPLAY_FONT}
      >
        <Compy3D size="1.2em" />
        <span aria-hidden="true" className="flex flex-wrap gap-x-[0.3em]">
          {before && <span>{before}</span>}
          <span className="text-brand-green">{coin}</span>
          {after && <span>{after}</span>}
        </span>
      </h1>
    )
  }

  const line = (text: string, accent = false) => (
    <SplitText
      offset={4}
      colorClassName={accent ? 'text-brand-green' : undefined}
      className="w-auto shrink-0"
    >
      {text}
    </SplitText>
  )

  return (
    <h1
      aria-label={t('jam.title')}
      className="font-display flex flex-col items-center text-[clamp(2.3rem,10vw,3.8rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase"
      style={DISPLAY_FONT}
    >
      <Compy3D size="1.7em" className="mb-[0.3em]" />
      <span
        aria-hidden="true"
        className="flex flex-col items-center gap-[0.08em]"
      >
        {before && line(before)}
        {line(coin, true)}
        {after && line(after)}
      </span>
    </h1>
  )
}

/** Link to the rules page. */
function RulesLink({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <Link
      to={JAM_RULES_PATH}
      className={
        className ??
        'text-brand-text-dim hover:text-foreground underline-offset-4 hover:underline'
      }
    >
      {t('jam.rules.link')}
    </Link>
  )
}

/** Centered shell for the sign-in, coming-soon and loading states. */
export function Hero({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <main
      className={`relative z-10 flex min-h-screen flex-col items-center justify-center ${PAGE_X} py-16`}
    >
      <div className="flex w-full flex-col items-center text-center">
        <BolsaTitle size="hero" />
        <div className="w-full max-w-[400px]">
          <p className="text-brand-text-dim mx-auto mt-6 mb-10 max-w-[34ch] text-[1rem] leading-relaxed">
            {t('jam.tagline')}
          </p>
          {children}
          <p className="mt-8 text-[0.88rem]">
            <RulesLink />
          </p>
        </div>
      </div>
    </main>
  )
}

/** Top bar for the signed-in and results views: title left, you right. */
function TopBar({
  phase,
  displayName,
  onSignOut,
}: {
  phase: JamPhase
  displayName: string | null
  onSignOut: (() => void) | null
}) {
  const { t } = useTranslation()
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex items-center gap-4">
        <BolsaTitle size="bar" />
        <StatusTag phase={phase} />
      </div>
      <div className="flex items-center gap-4 text-[0.85rem]">
        <RulesLink />
        {displayName && (
          <span className="text-brand-text-dim hidden sm:inline">
            {displayName}
          </span>
        )}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="border-brand-line hover:border-brand-text-faint h-9 border px-3.5 transition-colors"
          >
            {t('jam.market.signOut')}
          </button>
        )}
      </div>
    </header>
  )
}

/** The signed-in market: your account, the team list, ranking and history. */
export function MarketScreen({
  market,
  players,
  trades,
  playerId,
  displayName,
  cash,
  holdings,
  tradeBusy,
  tradeError,
  onTrade,
  onSignOut,
}: {
  market: JamMarket
  players: JamPlayer[]
  trades: JamTradePoint[]
  playerId: string
  displayName: string
  cash: number
  holdings: Record<string, number>
  tradeBusy: boolean
  tradeError: string
  onTrade: OnTrade
  onSignOut: () => void
}) {
  const { t } = useTranslation()
  const [openTeam, setOpenTeam] = useState<string | null>(null)
  const liveQ = useMemo(
    () => activeQ(market.q, market.finalists),
    [market.q, market.finalists],
  )
  // Teams still in play by price; eliminated ones sink to the bottom.
  const teamsSorted = useMemo(
    () =>
      [...market.teams].sort((a, b) => {
        const activeA = isActive(market, a.id)
        const activeB = isActive(market, b.id)
        if (activeA !== activeB) return activeA ? -1 : 1
        return (market.prices[b.id] ?? 0) - (market.prices[a.id] ?? 0)
      }),
    [market],
  )
  const motion = useRankMotion(teamsSorted.map((team) => team.id))
  const history = useMemo(
    () => buildPriceHistory(market, trades, Date.now()),
    [market, trades],
  )
  const canTrade = market.phase === 'open'
  const worth = netWorth(cash, holdings, market)
  const notice =
    market.phase === 'frozen'
      ? t('jam.market.frozenDesc')
      : market.phase === 'setup'
        ? t('jam.setupNote')
        : market.finalists
          ? t('jam.market.finalistsNotice')
          : null

  return (
    <main className={`relative z-10 min-h-screen ${PAGE_X} py-8`}>
      <div className="mx-auto w-full max-w-[1080px]">
        <TopBar
          phase={market.phase}
          displayName={displayName}
          onSignOut={onSignOut}
        />

        {notice && (
          <p className="border-brand-line text-brand-text-dim mb-6 border px-5 py-3.5 text-[0.9rem]">
            {notice}
          </p>
        )}
        {tradeError && (
          <p
            role="alert"
            className="text-brand-magenta-bright mb-4 text-[0.9rem]"
          >
            {tradeError}
          </p>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr]">
          <section className="border-brand-line bg-brand-panel border p-5 lg:col-start-2 lg:row-start-1">
            <p className="text-brand-text-dim text-[0.85rem]">
              {t('jam.market.netWorth')}
            </p>
            <p
              className="font-display mt-1.5 flex items-center gap-2 text-[2.1rem] leading-none font-extrabold tabular-nums"
              style={DISPLAY_FONT}
            >
              {formatCompys(worth)}
              <CompysMark className="size-[0.9em]" />
            </p>
            <p className="text-brand-text-dim mt-3 flex items-center gap-1.5 text-[0.85rem]">
              {t('jam.market.cash')}
              <span className="text-foreground tabular-nums">
                {formatCompys(cash)}
              </span>
              <CompysMark />
            </p>
          </section>

          <section className="border-brand-line bg-brand-panel border lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <div className="px-5 pt-5 pb-2">
              <WaveFunctionBar
                teams={market.teams}
                prices={market.prices}
                holdings={holdings}
              />
            </div>
            <div className="hidden sm:block">
              <div
                className={`${TEAM_ROW_GRID} text-brand-text-faint px-5 pt-3 pb-1.5 text-[0.8rem]`}
              >
                <span />
                <span>{t('jam.market.colTeam')}</span>
                <span className="text-right">{t('jam.market.colChance')}</span>
                <span className="text-right">{t('jam.market.colYours')}</span>
                <span />
              </div>
            </div>
            <ul className="relative">
              {teamsSorted.map((team) => (
                <TeamRow
                  key={team.id}
                  rowRef={motion.ref(team.id)}
                  rankDelta={motion.deltaOf(team.id)}
                  team={team}
                  price={market.prices[team.id] ?? 0}
                  liveQ={liveQ}
                  b={market.b}
                  cash={cash}
                  held={holdings[team.id] ?? 0}
                  canTrade={canTrade}
                  eliminated={!isActive(market, team.id)}
                  open={openTeam === team.id}
                  onToggle={() =>
                    setOpenTeam((current) =>
                      current === team.id ? null : team.id,
                    )
                  }
                  busy={tradeBusy}
                  onTrade={onTrade}
                />
              ))}
            </ul>
          </section>

          <div className="lg:col-start-2 lg:row-start-2">
            <Leaderboard
              players={players}
              market={market}
              meId={playerId}
              title={t('jam.leaderboard.title')}
            />
          </div>
        </div>

        {trades.length > 0 && (
          <div className="mt-6">
            <PriceHistoryChart
              market={market}
              history={history}
              holdings={holdings}
            />
          </div>
        )}
      </div>
    </main>
  )
}

/** The settled market: the collapse result next to the final ranking. */
export function ResultsScreen({
  market,
  players,
  meId,
  displayName,
  onSignOut,
}: {
  market: JamMarket
  players: JamPlayer[]
  meId: string | null
  displayName: string | null
  onSignOut: (() => void) | null
}) {
  const { t } = useTranslation()
  return (
    <main className={`relative z-10 min-h-screen ${PAGE_X} py-8`}>
      <div className="mx-auto w-full max-w-[1080px]">
        <TopBar
          phase={market.phase}
          displayName={displayName}
          onSignOut={onSignOut}
        />
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <CollapseResult market={market} players={players} meId={meId} />
          <Leaderboard
            players={players}
            market={market}
            meId={meId}
            title={t('jam.leaderboard.finalTitle')}
          />
        </div>
      </div>
    </main>
  )
}

export default function JamMarketPage() {
  const { t } = useTranslation()
  const { loading, market } = useJamMarket()
  const players = useJamPlayers()
  const trades = useJamTradeHistory()
  const [session, setSession] = useState<JamSession | null>(() => loadSession())
  const [tradeBusy, setTradeBusy] = useState(false)
  const [tradeError, setTradeError] = useState('')

  useEffect(() => {
    const saved = loadSession()
    if (!saved) return
    jamValidateSession(saved).catch(() => {
      clearSession()
      setSession(null)
    })
  }, [])

  const signOut = () => {
    clearSession()
    setSession(null)
  }

  /** Runs a trade; resolves true on success so the form can clear itself. */
  const onTrade: OnTrade = async (teamId, side, amount) => {
    if (!session || tradeBusy) return false
    setTradeBusy(true)
    setTradeError('')
    try {
      await jamTrade(session, teamId, side, amount)
      return true
    } catch (err) {
      const code = jamErrorCode(err)
      if (code === 'unauthenticated') signOut()
      else if (code === 'failed-precondition')
        setTradeError(t('jam.market.tradeRejected'))
      else setTradeError(t('jam.market.tradeFailed'))
      return false
    } finally {
      setTradeBusy(false)
    }
  }

  if (loading) {
    return (
      <Hero>
        <p className="text-brand-text-dim">{t('jam.loading')}</p>
      </Hero>
    )
  }

  if (!market) {
    return (
      <Hero>
        <p className="text-foreground">{t('jam.comingSoon')}</p>
      </Hero>
    )
  }

  const me = session
    ? players.find((p) => p.playerId === session.playerId)
    : undefined

  // The collapse is public: it is the reveal, and sign-in is closed by then.
  if (market.phase === 'settled') {
    return (
      <ResultsScreen
        market={market}
        players={players}
        meId={session?.playerId ?? null}
        displayName={session ? (me?.displayName ?? session.displayName) : null}
        onSignOut={session ? signOut : null}
      />
    )
  }

  // Everything else is gated behind the email: sign in first, then reveal.
  if (!session) {
    return (
      <Hero>
        <JamAuth onAuthed={(s) => setSession(s)} />
      </Hero>
    )
  }

  return (
    <MarketScreen
      market={market}
      players={players}
      trades={trades}
      playerId={session.playerId}
      displayName={me?.displayName ?? session.displayName}
      cash={me?.cash ?? 0}
      holdings={me?.holdings ?? {}}
      tradeBusy={tradeBusy}
      tradeError={tradeError}
      onTrade={onTrade}
      onSignOut={signOut}
    />
  )
}
