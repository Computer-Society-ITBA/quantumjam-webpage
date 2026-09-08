import { useEffect, useState } from 'react'

import {
  DEFAULT_REGISTRATION_FLAGS,
  getCachedRegistrationFlags,
  subscribeToRegistrationFlags,
  type RegistrationFlags,
} from '@/lib/featureFlags'

export type RegistrationFlagsState = {
  flags: RegistrationFlags
  loading: boolean
}

/**
 * How long to wait for Firestore before falling back to the defaults
 * (closed). A blocked or offline connection would otherwise leave the
 * visitor staring at the loading state forever.
 */
const FLAGS_TIMEOUT_MS = 6000

/**
 * Live registration feature flags.
 *
 * The Firestore read happens once per session: the first mount pays for
 * it, and every later one (a route change, a second component on the
 * page) is served synchronously from the shared cache, so navigating
 * around the site never re-fetches or flashes the loading state again.
 */
export function useRegistrationFlags(): RegistrationFlagsState {
  const [state, setState] = useState<RegistrationFlagsState>(() => {
    const cached = getCachedRegistrationFlags()
    return cached
      ? { flags: cached, loading: false }
      : { flags: DEFAULT_REGISTRATION_FLAGS, loading: true }
  })

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setState((s) => (s.loading ? { ...s, loading: false } : s)),
      FLAGS_TIMEOUT_MS,
    )
    const unsubscribe = subscribeToRegistrationFlags((flags) => {
      window.clearTimeout(timeout)
      setState({ flags, loading: false })
    })
    return () => {
      window.clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  return state
}
