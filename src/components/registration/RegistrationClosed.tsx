import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import type { RegistrationEvent } from '@/lib/featureFlags'

/**
 * Shown in place of a sign-up form while its feature flag is off. It is
 * what a direct visit to /register/<event> renders, so the form itself
 * never mounts when the flow is closed.
 */
export function RegistrationClosed({ event }: { event: RegistrationEvent }) {
  const { t } = useTranslation()
  return (
    <section className="relative z-10 px-[clamp(40px,6vw,80px)] pt-20 pb-16">
      <div className="mx-auto max-w-[560px]">
        <h2
          className="font-display text-foreground mb-[0.9rem] text-[clamp(1.5rem,3vw,2.15rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
          style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
        >
          {t(`registration.${event}.title`)}
        </h2>

        <div className="border-brand-line bg-brand-panel border p-8 text-center">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
            className="mx-auto mb-3.5 block w-14"
          >
            <rect
              x="17"
              y="29"
              width="30"
              height="22"
              stroke="var(--brand-text-dim)"
              strokeWidth="2"
            />
            <path
              d="M24 29 V22 a8 8 0 0 1 16 0 V29"
              stroke="var(--brand-text-dim)"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="32" cy="39" r="2.5" fill="var(--brand-text-dim)" />
          </svg>
          <h3 className="mb-2 text-[1.15rem] font-semibold">
            {t('registration.closed.title')}
          </h3>
          <p className="text-brand-text-dim mx-auto mb-6 max-w-[58ch]">
            {t(`registration.closed.${event}Desc`)}
          </p>
          <Button asChild variant="hero" size="cta">
            <Link to="/">{t('registration.closed.cta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
