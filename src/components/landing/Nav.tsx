import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

function LogoMark() {
  return (
    <img
      src="/logo.png"
      alt="Computer Society ITBA"
      className="h-12 w-auto self-start object-contain"
    />
  )
}

export function Nav() {
  const { t } = useTranslation()

  return (
    <nav
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-[clamp(20px,6vw,80px)] pt-4 pb-20"
      style={{
        background:
          'linear-gradient(to bottom, rgba(18,18,18,0.92) 0%, rgba(18,18,18,0.65) 40%, rgba(18,18,18,0) 100%)',
      }}
    >
      <Link
        to="/"
        aria-label={t('nav.brand')}
        className="pointer-events-auto flex items-center"
      >
        <LogoMark />
      </Link>
      <Button asChild variant="hero" size="sm" className="pointer-events-auto">
        <Link to="/register">{t('nav.cta')}</Link>
      </Button>
    </nav>
  )
}

export { LogoMark }
