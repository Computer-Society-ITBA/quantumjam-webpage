import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CheckInScanner } from '@/components/admin/CheckInScanner'
import { INPUT_CLASSES } from '@/components/admin/inputClasses'
import { WalkInForm } from '@/components/admin/WalkInForm'
import { FieldLabel } from '@/components/landing/QuantumField'
import { Button } from '@/components/ui/button'
import {
  ADMIN_COLLECTIONS,
  ADMIN_FIELDS,
  AdminApiError,
  TIMESTAMP_FIELDS,
  checkInToken,
  fetchAdminCollection,
  registerWalkIn,
  sendCompetitionQr,
  sendQr,
  type AdminCollection,
  type AdminCredentials,
  type AdminField,
  type AdminRow,
  type AdminValue,
  type CheckInEvent,
  type CheckInResult,
  type WalkInValues,
} from '@/lib/adminApi'
import { downloadCsv, toCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const MISSING = '—'

// The rest of each collection's fields live in the row's detail view.
const MAIN_COLUMNS: Record<AdminCollection, readonly AdminField[]> = {
  workshops: [
    'createdAt',
    'name',
    'email',
    'career',
    'level',
    'status',
    'qrSentAt',
  ],
  competition: [
    'createdAt',
    'firstName',
    'lastName',
    'email',
    'dni',
    'university',
    'teamId',
    'status',
    'qrSentAt',
    'competitionQrSentAt',
    'competitionCheckedInAt',
  ],
  contacts: ['firstSeenAt', 'email', 'status', 'purposes', 'verifiedAt'],
  talkAttendees: ['checkedInAt', 'name', 'age', 'university', 'source'],
}

const SORT_FIELD: Record<AdminCollection, AdminField> = {
  workshops: 'createdAt',
  competition: 'createdAt',
  contacts: 'firstSeenAt',
  talkAttendees: 'checkedInAt',
}

// Collections whose registrants receive a QR by email.
const QR_COLLECTIONS: readonly AdminCollection[] = ['workshops', 'competition']

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: AdminRow[]; fetchedAt: string }

type Collections = Record<AdminCollection, LoadState>

type LoginError = 'invalid' | 'expired' | 'unavailable'

type Panel = 'scan-talks' | 'scan-competition' | 'walkin' | null

type Bulk =
  | { phase: 'idle' }
  | { phase: 'confirm'; ids: string[] }
  | { phase: 'running'; total: number; sent: number; failed: number }
  | { phase: 'done'; total: number; sent: number; failed: number }

const EMPTY_QUERIES: Record<AdminCollection, string> = {
  workshops: '',
  competition: '',
  contacts: '',
  talkAttendees: '',
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function isMissing(value: AdminValue | undefined): value is null | undefined {
  return (
    value == null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function displayValue(
  field: AdminField,
  value: AdminValue | undefined,
  dateFormat: Intl.DateTimeFormat,
): string {
  if (isMissing(value)) return MISSING
  if (Array.isArray(value)) return value.join(', ')
  if (TIMESTAMP_FIELDS.has(field)) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
  }
  return value
}

/** Newest first; rows without the date go last, then by document ID. */
function sortRows(rows: AdminRow[], field: AdminField): AdminRow[] {
  const key = (row: AdminRow) => {
    const value = row[field]
    return typeof value === 'string' ? value : ''
  }
  return [...rows].sort((a, b) => {
    const ak = key(a)
    const bk = key(b)
    if (ak !== bk) return ak < bk ? 1 : -1
    return a.id.localeCompare(b.id)
  })
}

export default function AdminPage() {
  const { t } = useTranslation()
  const baseId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [loginError, setLoginError] = useState<LoginError | null>(null)
  // null while signed out. Credentials and rows only ever live in memory:
  // reloading the page or leaving it requires signing in again.
  const [collections, setCollections] = useState<Collections | null>(null)
  const [active, setActive] = useState<AdminCollection>('workshops')
  const [queries, setQueries] = useState(EMPTY_QUERIES)
  const [panel, setPanel] = useState<Panel>(null)
  const credentialsRef = useRef<AdminCredentials | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const signOut = (reason: LoginError | null) => {
    controllerRef.current?.abort()
    controllerRef.current = null
    credentialsRef.current = null
    setCollections(null)
    setQueries(EMPTY_QUERIES)
    setActive('workshops')
    setPanel(null)
    setSigningIn(false)
    setLoginError(reason)
  }

  // Every in-flight request carries the signal of the controller that
  // started it. Signing out or refreshing aborts that controller, so a
  // late response can never repopulate cleared data.
  const load = async (
    collection: AdminCollection,
    credentials: AdminCredentials,
    signal: AbortSignal,
  ) => {
    const put = (state: LoadState) =>
      setCollections((c) => (c ? { ...c, [collection]: state } : c))

    put({ status: 'loading' })
    try {
      const list = await fetchAdminCollection(collection, credentials, signal)
      if (signal.aborted) return
      put({ status: 'ready', ...list })
    } catch (err) {
      if (signal.aborted) return
      if (err instanceof AdminApiError && err.kind === 'unauthorized') {
        signOut('expired')
        return
      }
      put({ status: 'error' })
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signingIn || !username || !password) return

    const credentials = { username, password }
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setSigningIn(true)
    setLoginError(null)

    // The workshops read doubles as the credential check, so there is no
    // separate login endpoint and no session token.
    try {
      const workshops = await fetchAdminCollection(
        'workshops',
        credentials,
        controller.signal,
      )
      if (controller.signal.aborted) return
      credentialsRef.current = credentials
      setPassword('')
      setCollections({
        workshops: { status: 'ready', ...workshops },
        competition: { status: 'loading' },
        contacts: { status: 'loading' },
        talkAttendees: { status: 'loading' },
      })
      void load('competition', credentials, controller.signal)
      void load('contacts', credentials, controller.signal)
      void load('talkAttendees', credentials, controller.signal)
    } catch (err) {
      if (controller.signal.aborted) return
      setLoginError(
        err instanceof AdminApiError && err.kind === 'unauthorized'
          ? 'invalid'
          : 'unavailable',
      )
    } finally {
      if (controllerRef.current === controller) setSigningIn(false)
    }
  }

  const refresh = () => {
    const credentials = credentialsRef.current
    if (!credentials) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    for (const collection of ADMIN_COLLECTIONS) {
      void load(collection, credentials, controller.signal)
    }
  }

  const retry = (collection: AdminCollection) => {
    const credentials = credentialsRef.current
    const controller = controllerRef.current
    if (!credentials || !controller) return
    void load(collection, credentials, controller.signal)
  }

  // Runs a write with the in-memory credentials. A rejected session signs
  // out, exactly like the list requests do.
  const guard = async <T,>(
    run: (credentials: AdminCredentials) => Promise<T>,
  ): Promise<T> => {
    const credentials = credentialsRef.current
    if (!credentials) throw new Error('signed out')
    try {
      return await run(credentials)
    } catch (err) {
      if (err instanceof AdminApiError && err.kind === 'unauthorized') {
        signOut('expired')
      }
      throw err
    }
  }

  const afterCheckIn = (result: CheckInResult) => {
    if (result.result === 'ok') {
      retry(result.event === 'competition' ? 'competition' : 'talkAttendees')
    }
    return result
  }

  const handleScan = (event: CheckInEvent) => (token: string) =>
    guard((c) => checkInToken(token, event, c)).then(afterCheckIn)

  const handleWalkIn = (values: WalkInValues) =>
    guard((c) => registerWalkIn(values, c)).then(afterCheckIn)

  // refreshAfter is false for bulk sends, which refresh once at the end.
  const handleSendQr = async (
    collection: AdminCollection,
    id: string,
    event: CheckInEvent,
    refreshAfter = true,
  ) => {
    await guard((c) =>
      event === 'competition'
        ? sendCompetitionQr(id, c)
        : sendQr(collection, id, c),
    )
    if (refreshAfter) retry(collection) // picks up the new sent-at
  }

  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const count = ADMIN_COLLECTIONS.length
    const next =
      ADMIN_COLLECTIONS[
        (ADMIN_COLLECTIONS.indexOf(active) + step + count) % count
      ]
    setActive(next)
    document.getElementById(`${baseId}-tab-${next}`)?.focus()
  }

  const heading = (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <h1
        className="font-display text-foreground mb-[0.9rem] text-[clamp(1.6rem,3.4vw,2.3rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
        style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
      >
        {t('admin.title')}
      </h1>
      <p className="text-brand-text-dim mb-9 max-w-[58ch] font-light">
        {t('admin.description')}
      </p>
    </>
  )

  if (!collections) {
    return (
      <main className="relative z-10 flex min-h-screen flex-col justify-center px-[clamp(20px,6vw,80px)] py-16">
        <div className="mx-auto w-full max-w-[420px]">
          {heading}
          <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
            <div>
              <FieldLabel
                htmlFor={`${baseId}-username`}
                label={t('admin.login.username')}
                required
              />
              <input
                id={`${baseId}-username`}
                className={INPUT_CLASSES}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
              />
            </div>
            <div>
              <FieldLabel
                htmlFor={`${baseId}-password`}
                label={t('admin.login.password')}
                required
              />
              <input
                id={`${baseId}-password`}
                type="password"
                className={INPUT_CLASSES}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {loginError && (
              <p
                role="alert"
                className="text-brand-magenta-bright text-[0.85rem]"
              >
                {t(`admin.login.errors.${loginError}`)}
              </p>
            )}

            <Button
              type="submit"
              variant="hero"
              size="cta"
              disabled={signingIn || !username || !password}
              className="mt-2 w-full"
            >
              {signingIn
                ? t('admin.login.submitting')
                : t('admin.login.submit')}
            </Button>
          </form>
        </div>
      </main>
    )
  }

  const refreshing = ADMIN_COLLECTIONS.some(
    (c) => collections[c].status === 'loading',
  )

  return (
    <main className="relative z-10 min-h-screen px-[clamp(20px,6vw,80px)] py-16">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-wrap items-start justify-between gap-x-6">
          <div>{heading}</div>
          <div className="mb-9 flex flex-wrap gap-3">
            <Button
              variant={panel === 'scan-talks' ? 'hero' : 'outline'}
              onClick={() =>
                setPanel(panel === 'scan-talks' ? null : 'scan-talks')
              }
            >
              {t('admin.scanner.openTalks')}
            </Button>
            <Button
              variant={panel === 'scan-competition' ? 'hero' : 'outline'}
              onClick={() =>
                setPanel(
                  panel === 'scan-competition' ? null : 'scan-competition',
                )
              }
            >
              {t('admin.scanner.openCompetition')}
            </Button>
            <Button
              variant={panel === 'walkin' ? 'hero' : 'outline'}
              onClick={() => setPanel(panel === 'walkin' ? null : 'walkin')}
            >
              {t('admin.walkIn.open')}
            </Button>
            <Button
              variant="outline"
              onClick={refresh}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              {refreshing ? t('admin.refreshing') : t('admin.refresh')}
            </Button>
            <Button variant="outline" onClick={() => signOut(null)}>
              {t('admin.logout')}
            </Button>
          </div>
        </div>

        {/* Mounted only while open, so the camera is released on close. */}
        {panel && (
          <div className="border-brand-line mb-8 border p-5">
            {panel === 'walkin' ? (
              <WalkInForm onSubmit={handleWalkIn} />
            ) : (
              <>
                <p className="text-brand-green mb-3 text-center text-[0.85rem] font-medium tracking-wide uppercase">
                  {t(
                    panel === 'scan-competition'
                      ? 'admin.scanner.modeCompetition'
                      : 'admin.scanner.modeTalks',
                  )}
                </p>
                {/* key: switching event remounts the scanner, so a QR is
                    never checked in against the wrong event by a stale one */}
                <CheckInScanner
                  key={panel}
                  onScan={handleScan(
                    panel === 'scan-competition' ? 'competition' : 'talks',
                  )}
                />
              </>
            )}
          </div>
        )}

        <div
          role="tablist"
          aria-label={t('admin.collectionsLabel')}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onKeyDown={onTabKeyDown}
        >
          {ADMIN_COLLECTIONS.map((collection) => {
            const state = collections[collection]
            const selected = collection === active
            return (
              <button
                key={collection}
                type="button"
                role="tab"
                id={`${baseId}-tab-${collection}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(collection)}
                className={cn(
                  'bg-brand-panel border p-5 text-left transition-colors',
                  selected
                    ? 'border-brand-green'
                    : 'border-brand-line hover:border-brand-text-faint',
                )}
              >
                <span className="text-brand-text-dim block text-[0.78rem] font-medium">
                  {t(`admin.collections.${collection}`)}
                </span>
                <span
                  className={cn(
                    'font-display mt-2 block leading-none font-extrabold',
                    state.status === 'error'
                      ? 'text-brand-magenta-bright text-[1rem]'
                      : 'text-[2.2rem]',
                  )}
                >
                  {state.status === 'ready' && state.items.length}
                  {state.status === 'loading' && '…'}
                  {state.status === 'error' && t('admin.countFailed')}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-brand-text-faint mt-3 mb-8 text-[0.78rem]">
          {t('admin.notUnique')}
        </p>

        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active}`}
        >
          <CollectionPanel
            key={active}
            collection={active}
            state={collections[active]}
            query={queries[active]}
            onQueryChange={(query) =>
              setQueries((q) => ({ ...q, [active]: query }))
            }
            onRetry={() => retry(active)}
            onSendQr={(id, event, refreshAfter) =>
              handleSendQr(active, id, event, refreshAfter)
            }
          />
        </div>
      </div>
    </main>
  )
}

function CollectionPanel({
  collection,
  state,
  query,
  onQueryChange,
  onRetry,
  onSendQr,
}: {
  collection: AdminCollection
  state: LoadState
  query: string
  onQueryChange: (query: string) => void
  onRetry: () => void
  onSendQr: (
    id: string,
    event: CheckInEvent,
    refreshAfter?: boolean,
  ) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const baseId = useId()
  const [expanded, setExpanded] = useState<string | null>(null)
  // "<row id>:<event>" of the single send in flight / that failed.
  const [sending, setSending] = useState<string | null>(null)
  const [sendFailed, setSendFailed] = useState<string | null>(null)
  const [bulk, setBulk] = useState<Bulk>({ phase: 'idle' })
  const fields = ADMIN_FIELDS[collection]
  const columns = MAIN_COLUMNS[collection]
  const canSendQr = QR_COLLECTIONS.includes(collection)
  // The talks QR goes to everyone; the competition QR only to competitors.
  const qrEvents: CheckInEvent[] =
    collection === 'competition' ? ['talks', 'competition'] : ['talks']

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: TIME_ZONE,
      }),
    [i18n.language],
  )

  const rows = useMemo(
    () =>
      state.status === 'ready'
        ? sortRows(state.items, SORT_FIELD[collection])
        : [],
    [state, collection],
  )

  // Search covers every field, including the ones only shown in the
  // detail view, and matches both raw values and formatted dates.
  const searchIndex = useMemo(
    () =>
      rows.map((row) => {
        const parts = fields.flatMap((field) => {
          const value = row[field]
          if (isMissing(value)) return []
          const raw = Array.isArray(value) ? value.join(' ') : value
          return TIMESTAMP_FIELDS.has(field)
            ? [raw, displayValue(field, value, dateFormat)]
            : [raw]
        })
        return normalize(parts.join('\n'))
      }),
    [rows, fields, dateFormat],
  )

  const needle = normalize(query.trim())
  const visible = needle
    ? rows.filter((_, i) => searchIndex[i].includes(needle))
    : rows

  // Bulk send targets the rows currently shown (so the search box doubles
  // as a filter, e.g. by status) that have an email and no competition QR
  // yet. Rows already sent are skipped, so re-running only retries failures.
  const pendingIds =
    collection === 'competition'
      ? visible
          .filter(
            (row) =>
              !isMissing(row.email) && isMissing(row.competitionQrSentAt),
          )
          .map((row) => row.id)
      : []

  const runBulk = async (ids: string[]) => {
    let next = 0
    let sent = 0
    let failed = 0
    const progress = (phase: 'running' | 'done') =>
      setBulk({ phase, total: ids.length, sent, failed })
    progress('running')

    // A few sends at a time: faster than one by one, gentle on Gmail's SMTP.
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++]
        try {
          await onSendQr(id, 'competition', false)
          sent++
        } catch {
          failed++
        }
        progress('running')
      }
    }
    await Promise.all([worker(), worker(), worker()])
    progress('done')
    onRetry() // one refresh to pick up every new qrSentAt
  }

  const onExport = () => {
    const csv = toCsv(
      fields,
      visible.map((row) => fields.map((field) => row[field])),
    )
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
    }).format(new Date())
    const scope = needle ? '-filtered' : ''
    downloadCsv(`quantumjam-${collection}${scope}-${date}.csv`, csv)
  }

  const sendRowQr = async (id: string, event: CheckInEvent) => {
    const key = `${id}:${event}`
    setSending(key)
    setSendFailed(null)
    try {
      await onSendQr(id, event)
    } catch {
      setSendFailed(key)
    } finally {
      setSending(null)
    }
  }

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-brand-text-dim py-10 text-center">
        {t('admin.loading')}
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="py-10 text-center">
        <p className="text-brand-magenta-bright mb-4">
          {t('admin.loadFailed')}
        </p>
        <Button variant="outline" onClick={onRetry}>
          {t('admin.retry')}
        </Button>
      </div>
    )
  }

  const fetchedAt = new Intl.DateTimeFormat(i18n.language, {
    timeStyle: 'medium',
    timeZone: TIME_ZONE,
  }).format(new Date(state.fetchedAt))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <FieldLabel
            htmlFor={`${baseId}-search`}
            label={t('admin.search.label')}
          />
          <input
            id={`${baseId}-search`}
            type="search"
            className={INPUT_CLASSES}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('admin.search.placeholder')}
            aria-describedby={`${baseId}-results`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {query && (
          <Button
            variant="outline"
            className="h-12"
            onClick={() => onQueryChange('')}
          >
            {t('admin.search.clear')}
          </Button>
        )}
        <Button
          className="h-12"
          onClick={onExport}
          disabled={visible.length === 0}
        >
          {needle ? t('admin.export.filtered') : t('admin.export.all')}
        </Button>
        {collection === 'competition' &&
          (bulk.phase === 'confirm' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[0.85rem]">
                {t('admin.bulk.confirm', { n: bulk.ids.length })}
              </span>
              <Button className="h-12" onClick={() => runBulk(bulk.ids)}>
                {t('admin.bulk.confirmYes')}
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setBulk({ phase: 'idle' })}
              >
                {t('admin.bulk.cancel')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="h-12"
              disabled={bulk.phase === 'running' || pendingIds.length === 0}
              onClick={() => setBulk({ phase: 'confirm', ids: pendingIds })}
            >
              {t('admin.bulk.button', { n: pendingIds.length })}
            </Button>
          ))}
      </div>

      {(bulk.phase === 'running' || bulk.phase === 'done') && (
        <p role="status" className="text-brand-text-dim mb-3 text-[0.85rem]">
          {bulk.phase === 'running'
            ? t('admin.bulk.running', {
                done: bulk.sent + bulk.failed,
                total: bulk.total,
              })
            : t('admin.bulk.done', { sent: bulk.sent, failed: bulk.failed })}
        </p>
      )}

      <p
        id={`${baseId}-results`}
        aria-live="polite"
        className="text-brand-text-dim mb-3 flex flex-wrap justify-between gap-x-4 text-[0.8rem]"
      >
        <span>
          {t('admin.search.results', {
            count: visible.length,
            total: rows.length,
          })}
        </span>
        <span>{t('admin.fetchedAt', { time: fetchedAt })}</span>
      </p>

      {visible.length === 0 ? (
        <p className="text-brand-text-dim border-brand-line border py-10 text-center">
          {rows.length === 0 ? t('admin.empty') : t('admin.noMatches')}
        </p>
      ) : (
        <div
          role="region"
          aria-label={t(`admin.collections.${collection}`)}
          tabIndex={0}
          className="border-brand-line overflow-x-auto border"
        >
          <table className="w-full text-left text-[0.85rem]">
            <thead className="bg-brand-panel text-brand-text-dim">
              <tr>
                <th scope="col" className="w-10 px-3 py-2.5">
                  <span className="sr-only">{t('admin.details.column')}</span>
                </th>
                {columns.map((field) => (
                  <th
                    key={field}
                    scope="col"
                    className="px-3 py-2.5 font-medium whitespace-nowrap"
                  >
                    {t(`admin.fields.${field}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const open = expanded === row.id
                const detailId = `${baseId}-detail-${row.id}`
                return (
                  <Fragment key={row.id}>
                    <tr className="border-brand-line border-t">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={open ? detailId : undefined}
                          aria-label={
                            open
                              ? t('admin.details.hide')
                              : t('admin.details.show')
                          }
                          onClick={() => setExpanded(open ? null : row.id)}
                          className="text-brand-green hover:bg-brand-green/10 size-7 border border-current leading-none"
                        >
                          {open ? '−' : '+'}
                        </button>
                      </td>
                      {columns.map((field) => (
                        <td
                          key={field}
                          className="max-w-[28ch] truncate px-3 py-2 whitespace-nowrap"
                        >
                          {displayValue(field, row[field], dateFormat)}
                        </td>
                      ))}
                    </tr>
                    {open && (
                      <tr id={detailId} className="bg-brand-panel">
                        <td colSpan={columns.length + 1} className="px-3 py-4">
                          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
                            {fields.map((field) => (
                              <Fragment key={field}>
                                <dt className="text-brand-text-dim">
                                  {t(`admin.fields.${field}`)}
                                </dt>
                                <dd className="break-words whitespace-pre-wrap">
                                  {displayValue(field, row[field], dateFormat)}
                                </dd>
                              </Fragment>
                            ))}
                          </dl>
                          {canSendQr && (
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              {qrEvents.map((event) => {
                                const key = `${row.id}:${event}`
                                return (
                                  <Fragment key={event}>
                                    <Button
                                      variant="outline"
                                      disabled={sending === key}
                                      onClick={() => sendRowQr(row.id, event)}
                                    >
                                      {sending === key
                                        ? t('admin.sendQr.sending')
                                        : t(
                                            event === 'competition'
                                              ? 'admin.sendQr.competitionButton'
                                              : 'admin.sendQr.button',
                                          )}
                                    </Button>
                                    {sendFailed === key && (
                                      <span
                                        role="alert"
                                        className="text-brand-magenta-bright text-[0.85rem]"
                                      >
                                        {t('admin.sendQr.failed')}
                                      </span>
                                    )}
                                  </Fragment>
                                )
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
