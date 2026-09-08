import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const firestore = vi.hoisted(() => ({
  onSnapshot: vi.fn(),
  doc: vi.fn(() => ({ id: 'registration' })),
}))

vi.mock('firebase/firestore', () => ({
  doc: firestore.doc,
  onSnapshot: firestore.onSnapshot,
}))

vi.mock('@/lib/firebase', () => ({ db: {} }))

type Snap = { data: () => Record<string, unknown> | undefined }

async function loadModule() {
  return await import('./featureFlags')
}

describe('subscribeToRegistrationFlags', () => {
  let emit: (snap: Snap) => void
  const unsubscribeSpy = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    firestore.onSnapshot.mockReset()
    unsubscribeSpy.mockReset()
    firestore.onSnapshot.mockImplementation((_ref, next) => {
      emit = next
      return unsubscribeSpy
    })
  })

  afterEach(async () => {
    const mod = await loadModule()
    mod.resetRegistrationFlagsCache()
  })

  it('opens one Firestore listener no matter how many subscribers there are', async () => {
    const { subscribeToRegistrationFlags } = await loadModule()

    const a = vi.fn()
    const b = vi.fn()
    subscribeToRegistrationFlags(a)
    subscribeToRegistrationFlags(b)

    expect(firestore.onSnapshot).toHaveBeenCalledTimes(1)

    emit({ data: () => ({ workshopsRegistrationOpen: true }) })
    expect(a).toHaveBeenCalledWith(
      expect.objectContaining({ workshopsRegistrationOpen: true }),
    )
    expect(b).toHaveBeenCalledWith(
      expect.objectContaining({ workshopsRegistrationOpen: true }),
    )
  })

  it('serves a later subscriber from the cache, without re-reading', async () => {
    const { subscribeToRegistrationFlags } = await loadModule()

    subscribeToRegistrationFlags(vi.fn())
    emit({ data: () => ({ competitionRegistrationOpen: true }) })

    // A route change mounts a new consumer: no second read, and it gets
    // the flags synchronously.
    const late = vi.fn()
    subscribeToRegistrationFlags(late)

    expect(firestore.onSnapshot).toHaveBeenCalledTimes(1)
    expect(late).toHaveBeenCalledWith(
      expect.objectContaining({ competitionRegistrationOpen: true }),
    )
  })

  it('keeps the listener alive when one subscriber unmounts', async () => {
    const { subscribeToRegistrationFlags } = await loadModule()

    const unsubscribe = subscribeToRegistrationFlags(vi.fn())
    subscribeToRegistrationFlags(vi.fn())
    unsubscribe()

    expect(unsubscribeSpy).not.toHaveBeenCalled()
  })

  it('falls back to closed when the read is denied', async () => {
    let fail: (err: unknown) => void = () => {}
    firestore.onSnapshot.mockImplementation((_ref, _next, onError) => {
      fail = onError
      return unsubscribeSpy
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { subscribeToRegistrationFlags, DEFAULT_REGISTRATION_FLAGS } =
      await loadModule()

    const listener = vi.fn()
    subscribeToRegistrationFlags(listener)
    fail(new Error('permission-denied'))

    expect(listener).toHaveBeenCalledWith(DEFAULT_REGISTRATION_FLAGS)
    // Loud on purpose: a denied read looks exactly like a closed flag.
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
