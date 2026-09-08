import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { RegistrationClosed } from '@/components/registration/RegistrationClosed'
import { useRegistrationFlags } from '@/hooks/useRegistrationFlags'
import { isRegistrationOpen, type RegistrationEvent } from '@/lib/featureFlags'

/**
 * Renders a sign-up flow only while its Firestore feature flag is on.
 * Children are not mounted at all otherwise, so reaching the page by URL
 * gets the locked state rather than the form.
 */
export function RegistrationGate({
  event,
  children,
}: {
  event: RegistrationEvent
  children: ReactNode
}) {
  const { t } = useTranslation()
  const { flags, loading } = useRegistrationFlags()

  if (loading) {
    return (
      <section className="relative z-10 px-[clamp(40px,6vw,80px)] pt-20 pb-16">
        <div
          role="status"
          className="text-brand-text-dim mx-auto max-w-[560px] animate-pulse text-[0.9rem]"
        >
          {t('registration.closed.loading')}
        </div>
      </section>
    )
  }

  if (!isRegistrationOpen(flags, event)) {
    return <RegistrationClosed event={event} />
  }

  return <>{children}</>
}
