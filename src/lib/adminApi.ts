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
