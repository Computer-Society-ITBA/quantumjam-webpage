import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { INPUT_CLASSES } from '@/components/admin/inputClasses'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { JamAdminState } from '@/lib/adminApi'
import { formatPercent } from '@/lib/jamMarket'

type Action = 'setup' | 'open' | 'freeze' | 'finalists' | 'settle' | 'reset'

type Load =
  | { status: 'loading' }
  | { status: 'error' }
  | ({ status: 'ready' } & JamAdminState)

const PRICE_SCALE = 100

export function JamAdminPanel({
  loadState,
  runAction,
}: {
  loadState: () => Promise<JamAdminState>
  runAction: (action: Action, body: unknown) => Promise<void>
}) {
  const { t } = useTranslation()
  const [state, setState] = useState<Load>({ status: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [teamText, setTeamText] = useState('')
  const [winner, setWinner] = useState('')
  // null until the admin edits the checklist: it starts from the market.
  const [finalistPick, setFinalistPick] = useState<string[] | null>(null)
  const [confirm, setConfirm] = useState<
    'settle' | 'reset' | 'finalists' | null
  >(null)

  const refresh = useCallback(async () => {
    try {
      const data = await loadState()
      setState({ status: 'ready', ...data })
    } catch {
      setState({ status: 'error' })
    }
  }, [loadState])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const run = async (action: Action, body: unknown) => {
    setBusy(true)
    setError('')
    try {
      await runAction(action, body)
      setConfirm(null)
      await refresh()
    } catch {
      setError(t('admin.jam.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <p className="text-brand-text-dim py-6 text-center">
        {t('admin.loading')}
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="py-6 text-center">
        <p className="text-brand-magenta-bright mb-3">
          {t('admin.loadFailed')}
        </p>
        <Button variant="outline" onClick={() => void refresh()}>
          {t('admin.retry')}
        </Button>
      </div>
    )
  }

  const { market, players } = state
  const phase = market?.phase ?? null

  const submitSetup = () => {
    const teams = teamText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    void run('setup', { teams })
  }

  const submitSettle = () => {
    if (!winner) {
      setError(t('admin.jam.pickWinner'))
      return
    }
    void run('settle', { winner })
  }

  const picked = finalistPick ?? market?.finalists ?? []
  const submitFinalists = () => {
    if (picked.length < 2) {
      setError(t('admin.jam.pickFinalists'))
      return
    }
    void run('finalists', { teamIds: picked })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-brand-text-dim text-[0.85rem]">
          {t('admin.jam.phaseLabel')}:{' '}
          <span className="text-brand-green font-medium uppercase">
            {phase ? t(`jam.phase.${phase}`) : t('admin.jam.noMarket')}
          </span>
          {market && (
            <span className="text-brand-text-faint ml-3">
              {t('admin.jam.playerCount', { count: players.length })}
            </span>
          )}
        </p>
        <Button
          variant="outline"
          onClick={() => void refresh()}
          disabled={busy}
        >
          {t('admin.refresh')}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-brand-magenta-bright text-[0.85rem]">
          {error}
        </p>
      )}

      {/* Create market: no market yet, or still in setup. */}
      {(!market || phase === 'setup') && (
        <div className="border-brand-line border p-4">
          <p className="font-display mb-2 text-[0.9rem] font-bold">
            {t('admin.jam.setupTitle')}
          </p>
          <p className="text-brand-text-dim mb-3 text-[0.8rem]">
            {t('admin.jam.setupDesc')}
          </p>
          <textarea
            value={teamText}
            onChange={(e) => setTeamText(e.target.value)}
            rows={6}
            className={cn(INPUT_CLASSES, 'resize-y')}
            placeholder={t('admin.jam.teamsPlaceholder')}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Button onClick={submitSetup} disabled={busy}>
              {market ? t('admin.jam.recreate') : t('admin.jam.create')}
            </Button>
            {market && (
              <Button
                variant="hero"
                onClick={() => void run('open', {})}
                disabled={busy}
              >
                {t('admin.jam.open')}
              </Button>
            )}
          </div>
          {market && market.teams.length > 0 && (
            <p className="text-brand-text-faint mt-3 text-[0.8rem]">
              {market.teams.map((team) => team.name).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Open: live odds + freeze. */}
      {market && phase === 'open' && (
        <div className="border-brand-line border p-4">
          <TeamOdds market={market} />
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void run('freeze', {})}
            disabled={busy}
          >
            {t('admin.jam.freeze')}
          </Button>
        </div>
      )}

      {/* Open or frozen: choose the finalists. */}
      {market && (phase === 'open' || phase === 'frozen') && (
        <div className="border-brand-line border p-4">
          <p className="font-display mb-2 text-[0.9rem] font-bold">
            {t('admin.jam.finalistsTitle')}
          </p>
          <p className="text-brand-text-dim mb-3 text-[0.8rem]">
            {t('admin.jam.finalistsDesc')}
          </p>
          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {market.teams.map((team) => (
              <label
                key={team.id}
                className="flex items-center gap-2.5 text-[0.88rem]"
              >
                <input
                  type="checkbox"
                  checked={picked.includes(team.id)}
                  onChange={(e) => {
                    setConfirm(null)
                    setFinalistPick(
                      e.target.checked
                        ? [...picked, team.id]
                        : picked.filter((id) => id !== team.id),
                    )
                  }}
                  className="size-4 accent-[var(--brand-green)]"
                />
                {team.name}
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {confirm === 'finalists' ? (
              <>
                <span className="text-[0.85rem]">
                  {t('admin.jam.finalistsConfirm', { count: picked.length })}
                </span>
                <Button onClick={submitFinalists} disabled={busy}>
                  {t('admin.jam.finalistsYes')}
                </Button>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  {t('admin.bulk.cancel')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setConfirm('finalists')}
                disabled={busy || picked.length < 2}
              >
                {t('admin.jam.finalistsSave')}
              </Button>
            )}
            {market.finalists && (
              <span className="text-brand-text-dim text-[0.8rem]">
                {t('admin.jam.finalistsCurrent', {
                  count: market.finalists.length,
                })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Frozen: pick the winner and collapse. */}
      {market && phase === 'frozen' && (
        <div className="border-brand-line border p-4">
          <p className="font-display mb-2 text-[0.9rem] font-bold">
            {t('admin.jam.settleTitle')}
          </p>
          <p className="text-brand-text-dim mb-3 text-[0.8rem]">
            {t('admin.jam.settleDesc')}
          </p>
          <label className="flex items-center gap-3 text-[0.85rem]">
            <span className="text-brand-text-dim shrink-0">
              {t('admin.jam.winnerLabel')}
            </span>
            <select
              value={winner}
              onChange={(e) => {
                setWinner(e.target.value)
                setConfirm(null)
              }}
              className={cn(INPUT_CLASSES, 'h-10')}
            >
              <option value="">{t('admin.jam.pickTeam')}</option>
              {market.teams
                .filter(
                  (team) =>
                    !market.finalists || market.finalists.includes(team.id),
                )
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {confirm === 'settle' ? (
              <>
                <span className="text-[0.85rem]">
                  {t('admin.jam.settleConfirm')}
                </span>
                <Button variant="hero" onClick={submitSettle} disabled={busy}>
                  {t('admin.jam.settleYes')}
                </Button>
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  {t('admin.bulk.cancel')}
                </Button>
              </>
            ) : (
              <Button
                variant="hero"
                onClick={() => setConfirm('settle')}
                disabled={busy}
              >
                {t('admin.jam.settle')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Settled: show the winner. */}
      {market && phase === 'settled' && market.podium?.[0] && (
        <div className="border-brand-green/50 border p-4">
          <p className="font-display mb-2 text-[0.9rem] font-bold">
            {t('admin.jam.settledTitle')}
          </p>
          <p className="text-[0.9rem]">
            <span className="text-brand-text-dim">
              {t('admin.jam.winnerLabel')}:
            </span>{' '}
            <span className="text-brand-green font-bold">
              {market.teams.find((team) => team.id === market.podium?.[0])
                ?.name ?? market.podium[0]}
            </span>
          </p>
        </div>
      )}

      {/* Danger zone: reset wipes players and trades. */}
      {market && (
        <div className="border-brand-line border p-4">
          {confirm === 'reset' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-brand-magenta-bright text-[0.85rem]">
                {t('admin.jam.resetConfirm')}
              </span>
              <Button
                variant="destructive"
                onClick={() => void run('reset', {})}
                disabled={busy}
              >
                {t('admin.jam.resetYes')}
              </Button>
              <Button variant="outline" onClick={() => setConfirm(null)}>
                {t('admin.bulk.cancel')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setConfirm('reset')}
              disabled={busy}
            >
              {t('admin.jam.reset')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function TeamOdds({
  market,
}: {
  market: NonNullable<JamAdminState['market']>
}) {
  const sorted = [...market.teams].sort(
    (a, b) => (market.prices[b.id] ?? 0) - (market.prices[a.id] ?? 0),
  )
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((team) => {
        const price = market.prices[team.id] ?? 0
        const pct = Math.max(0, Math.min(100, (price / PRICE_SCALE) * 100))
        return (
          <div key={team.id} className="flex items-center gap-3 text-[0.85rem]">
            <span className="w-40 truncate">{team.name}</span>
            <div className="bg-brand-bg h-2 flex-1 overflow-hidden">
              <div
                className="bg-brand-green h-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-brand-green w-14 text-right tabular-nums">
              {formatPercent(pct)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
