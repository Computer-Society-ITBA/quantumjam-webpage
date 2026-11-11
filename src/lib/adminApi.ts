export type AdminCollection = 'workshops' | 'competition' | 'contacts'

export const ADMIN_COLLECTIONS: readonly AdminCollection[] = [
  'workshops',
  'competition',
  'contacts',
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
    'competitionQrSentAt',
    'competitionQrClaimedAt',
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
} as const satisfies Record<AdminCollection, readonly string[]>

export type AdminField = (typeof ADMIN_FIELDS)[AdminCollection][number]

export const TIMESTAMP_FIELDS: ReadonlySet<AdminField> = new Set([
  'createdAt',
  'firstSeenAt',
  'updatedAt',
  'verifiedAt',
  'competitionQrSentAt',
  'competitionQrClaimedAt',
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

export type CheckInResult =
  | { result: 'ok'; label: string }
  | { result: 'already'; label: string; checkedInAt: string }
  | { result: 'notAccepted'; label: string }
  | { result: 'invalid' }

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
  const { result, label, checkedInAt } = body as Record<string, unknown>
  if (result === 'invalid') return true
  if (result === 'ok' || result === 'notAccepted') {
    return typeof label === 'string'
  }
  return (
    result === 'already' &&
    typeof label === 'string' &&
    typeof checkedInAt === 'string'
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

/** Checks someone in to the competition from a scanned QR token. */
export const checkInToken = (token: string, credentials: AdminCredentials) =>
  postCheckIn('checkin', { token }, credentials)

export const COMPETITION_QR_OUTCOMES = [
  'sent',
  'alreadySent',
  'inProgress',
  'notApproved',
  'noTeam',
  'notConfigured',
] as const
export type CompetitionQrOutcome = (typeof COMPETITION_QR_OUTCOMES)[number]

/**
 * Emails a competition registrant their competition check-in QR. The
 * server only sends to approved registrants with a team, and never twice
 * unless `resend` is set.
 */
export async function sendCompetitionQr(
  id: string,
  credentials: AdminCredentials,
  resend = false,
): Promise<CompetitionQrOutcome> {
  const body = await postAdmin(
    `competition/${encodeURIComponent(id)}/send-competition-qr`,
    { resend },
    credentials,
  )
  const result = (body as { result?: unknown } | null)?.result
  if (!COMPETITION_QR_OUTCOMES.includes(result as CompetitionQrOutcome)) {
    throw new AdminApiError('unavailable')
  }
  return result as CompetitionQrOutcome
}
