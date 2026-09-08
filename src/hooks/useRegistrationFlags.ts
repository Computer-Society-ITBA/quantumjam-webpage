import { useEffect, useState } from 'react'

import {
  DEFAULT_REGISTRATION_FLAGS,
  subscribeToRegistrationFlags,
  type RegistrationFlags,
} from '@/lib/featureFlags'

export type RegistrationFlagsState = {
  flags: RegistrationFlags
  loading: boolean
}

/**
 * How long to wait for Firestore before giving up and using the defaults.
 * A slow or blocked connection would otherwise leave the visitor staring
 * at the loading state instead of a sign-up form.
 */
const FLAGS_TIMEOUT_MS = 4000

/**
 * Live registration feature flags. Stays `loading` until Firestore
 * answers so callers can hold back the gated UI instead of flashing a
 * form that is about to be locked.
 */
export function useRegistrationFlags(): RegistrationFlagsState {
  const [state, setState] = useState<RegistrationFlagsState>({
    flags: DEFAULT_REGISTRATION_FLAGS,
    loading: true,
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
