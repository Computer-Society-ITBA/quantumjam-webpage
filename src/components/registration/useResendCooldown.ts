import { useEffect, useState } from 'react'

export const RESEND_COOLDOWN = 30

/** Counts down from RESEND_COOLDOWN while `active` is true. */
export function useResendCooldown(active: boolean) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => {
      setCooldown((c) => Math.max(c - 1, 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [active])

  const reset = () => setCooldown(RESEND_COOLDOWN)

  return { cooldown, reset }
}
