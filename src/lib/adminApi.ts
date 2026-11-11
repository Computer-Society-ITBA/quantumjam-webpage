export type AdminCollection =
  'workshops' | 'competition' | 'contacts' | 'talkAttendees'

export const ADMIN_COLLECTIONS: readonly AdminCollection[] = [
  'workshops',
  'competition',
  'contacts',
  'talkAttendees',
]

// Mirrors the allowlist in functions/src/backoffice.ts. Order here is the
// CSV column order.
export const ADMIN_FIELDS = {
  workshops: [
    'id',
    'createdAt',
    'email',
    'name',
    'career',
    'level',
    'reason',
    'status',
    'lang',
    'qrSentAt',
  ],
  competition: [
    'id',
    'createdAt',
    'email',
    'firstName',
    'lastName',
    'dni',
    'age',
    'university',
    'major',
    'gradYear',
    'location',
    'diet',
    'github',
    'linkedin',
    'x',
    'instagram',
    'website',
    'teamChoice',
    'teamId',
    'status',
    'lang',
    'qrSentAt',
    'competitionQrSentAt',
    'competitionCheckedInAt',
  ],
  contacts: [
    'id',
    'firstSeenAt',
    'email',
    'canonicalEmail',
    'status',
    'purposes',
    'updatedAt',
    'verifiedAt',
  ],
  talkAttendees: [
    'id',
    'checkedInAt',
    'name',
    'age',
    'university',
    'email',
    'source',
    'registrationId',
  ],
} as const satisfies Record<AdminCollection, readonly string[]>

export type AdminField = (typeof ADMIN_FIELDS)[AdminCollection][number]

export const TIMESTAMP_FIELDS: ReadonlySet<AdminField> = new Set([
  'createdAt',
  'firstSeenAt',
  'updatedAt',
  'verifiedAt',
  'qrSentAt',
  'checkedInAt',
  'competitionQrSentAt',
  'competitionCheckedInAt',
])

export type AdminValue = string | string[] | null
export type AdminRow = Partial<Record<AdminField, AdminValue>> & { id: string }

export type AdminList = {
  items: AdminRow[]
  fetchedAt: string
}

export type AdminCredentials = {
  username: string
  password: string
}

export type CheckInEvent = 'talks' | 'competition'

export type CheckInResult =
  | { result: 'ok'; label: string; event: CheckInEvent }
  | {
      result: 'already'
      label: string
      checkedInAt: string
      event: CheckInEvent
    }
  | { result: 'wrongEvent' }
  | { result: 'invalid' }

export type WalkInValues = { name: string; age: string; university: string }

export class AdminApiError extends Error {
  readonly kind: 'unauthorized' | 'unavailable'

  constructor(kind: 'unauthorized' | 'unavailable') {
    super(kind)
    this.kind = kind
  }
}

function basicAuthHeader({ username, password }: AdminCredentials): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  return `Basic ${btoa(String.fromCharCode(...bytes))}`
}

function isAdminList(body: unknown): body is AdminList {
  if (typeof body !== 'object' || body === null) return false
  const { items, fetchedAt } = body as Record<string, unknown>
  return Array.isArray(items) && typeof fetchedAt === 'string'
}

function isCheckInResult(body: unknown): body is CheckInResult {
  if (typeof body !== 'object' || body === null) return false
  const { result, label, checkedInAt, event } = body as Record<string, unknown>
  if (result === 'invalid' || result === 'wrongEvent') return true
  const eventOk = event === 'talks' || event === 'competition'
  if (result === 'ok') return typeof label === 'string' && eventOk
  return (
    result === 'already' &&
    typeof label === 'string' &&
    typeof checkedInAt === 'string' &&
    eventOk
  )
}

/**
 * Reads one whole collection through the admin API. Credentials go in an
 * explicit header with `credentials: 'omit'`, so the browser neither
 * attaches cached HTTP auth nor prompts with its own dialog on a 401.
 */
export async function fetchAdminCollection(
  collection: AdminCollection,
  credentials: AdminCredentials,
  signal: AbortSignal,
): Promise<AdminList> {
  let res: Response
  try {
    res = await fetch(`/api/admin/${collection}`, {
      headers: {
        Accept: 'application/json',
        Authorization: basicAuthHeader(credentials),
      },
      credentials: 'omit',
      cache: 'no-store',
      signal,
    })
  } catch (err) {
    if (signal.aborted) throw err
    throw new AdminApiError('unavailable')
  }

  if (res.status === 401) throw new AdminApiError('unauthorized')
  if (!res.ok) throw new AdminApiError('unavailable')

  // Without the Hosting rewrite (e.g. plain `vite dev`) the SPA fallback
  // answers 200 with index.html, so the body shape is checked too.
  const body: unknown = await res.json().catch(() => null)
  if (!isAdminList(body)) throw new AdminApiError('unavailable')
  return body
}

/**
 * Sends a JSON write to the admin API, with the same credential handling
 * as the reads. The API requires the JSON content type on writes.
 */
async function postAdmin(
  path: string,
  payload: unknown,
  credentials: AdminCredentials,
): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(`/api/admin/${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: basicAuthHeader(credentials),
      },
      body: JSON.stringify(payload),
      credentials: 'omit',
      cache: 'no-store',
    })
  } catch {
    throw new AdminApiError('unavailable')
  }

  if (res.status === 401) throw new AdminApiError('unauthorized')
  if (!res.ok) throw new AdminApiError('unavailable')
  return res.json().catch(() => null)
}

async function postCheckIn(
  path: string,
  payload: unknown,
  credentials: AdminCredentials,
): Promise<CheckInResult> {
  const body = await postAdmin(path, payload, credentials)
  if (!isCheckInResult(body)) throw new AdminApiError('unavailable')
  return body
}

/**
 * Checks someone in from a scanned QR token, for the event the scanner is
 * set to. The server refuses a QR that belongs to the other event.
 */
export const checkInToken = (
  token: string,
  event: CheckInEvent,
  credentials: AdminCredentials,
) => postCheckIn('checkin', { token, event }, credentials)

/** Registers (and checks in) someone on the spot. */
export const registerWalkIn = (
  values: WalkInValues,
  credentials: AdminCredentials,
) => postCheckIn('walkin', values, credentials)

/** Emails a workshop or competition registrant their check-in QR. */
export async function sendQr(
  collection: AdminCollection,
  id: string,
  credentials: AdminCredentials,
): Promise<void> {
  const body = await postAdmin(
    `${collection}/${encodeURIComponent(id)}/send-qr`,
    {},
    credentials,
  )
  const ok = (body as { ok?: unknown } | null)?.ok === true
  if (!ok) throw new AdminApiError('unavailable')
}

/** Emails a competition registrant their competition check-in QR. */
export async function sendCompetitionQr(
  id: string,
  credentials: AdminCredentials,
): Promise<void> {
  const body = await postAdmin(
    `competition/${encodeURIComponent(id)}/send-competition-qr`,
    {},
    credentials,
  )
  const ok = (body as { ok?: unknown } | null)?.ok === true
  if (!ok) throw new AdminApiError('unavailable')
}
