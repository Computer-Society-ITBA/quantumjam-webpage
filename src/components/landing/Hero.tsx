import { Calendar, MapPin, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import quantumJamLogo from '@/assets/quantum-jam-logo-primary.svg?raw'
import { HeroField } from '@/components/landing/HeroField'
import { IbmLogo } from '@/components/landing/IbmLogo'
import { Nav } from './Nav'

const heroWordmarkSvg = quantumJamLogo.replace(
  '<svg ',
  '<svg aria-hidden="true" focusable="false" ',
)

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar
  children: React.ReactNode
}) {
  return (
    <span className="border-brand-line bg-brand-bg/85 text-brand-text-dim inline-flex items-center gap-1.5 border-2 px-2 py-1.5 text-[0.55rem] tracking-[0.06em] sm:gap-2 sm:px-[14px] sm:py-2 sm:text-[0.7rem] sm:tracking-[0.1em]">
      <Icon className="text-brand-green size-3 sm:size-4" strokeWidth={1.8} />
      <b className="text-foreground font-medium">{children}</b>
    </span>
  )
}

function IbmBadge() {
  return (
    <span className="border-brand-line bg-brand-bg/85 inline-flex items-center border-2 px-3 pt-2 pb-1.5 sm:px-[18px] sm:pt-2.5 sm:pb-2">
      <IbmLogo className="h-[11px] sm:h-[14px]" />
    </span>
  )
}

export function Hero() {
  const { t } = useTranslation()

  return (
    <section className="border-brand-line relative flex min-h-screen flex-col items-center justify-center overflow-hidden border-b px-[clamp(20px,6vw,80px)] py-[clamp(80px,10vh,140px)] text-center">
      <Nav />
      <HeroField glow={1.7} />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 42%, rgba(7,7,7,0) 0%, rgba(7,7,7,0.55) 55%, var(--brand-bg) 92%)',
        }}
      />

      <div className="relative z-10 flex max-w-[1200px] flex-col items-center">
        <div className="bg-brand-bg/85 text-brand-text-dim mb-6 inline-flex items-center gap-2 px-2 py-1 text-[0.65rem] sm:mb-0 sm:gap-[10px] sm:px-3 sm:py-1.5 sm:text-[0.8rem]">
          <span>{t('hero.sponsored_by')}</span>
          <IbmBadge />
        </div>

        <h1
          aria-label={t('nav.brand')}
          className="hero-wordmark mx-auto mb-5 w-[clamp(240px,70vw,760px)] sm:-translate-y-2"
          dangerouslySetInnerHTML={{ __html: heroWordmarkSvg }}
        />

        <p className="bg-brand-bg/85 text-brand-text-dim mx-auto mb-6 inline-block max-w-[46ch] px-3 py-1.5 text-[clamp(1rem,1.5vw,1.15rem)] font-light">
          {t('hero.subtitle')}
        </p>

        <div className="flex flex-nowrap items-stretch justify-center gap-1.5 sm:gap-3">
          <MetaChip icon={Calendar}>{t('hero.date')}</MetaChip>
          <MetaChip icon={MapPin}>{t('hero.place')}</MetaChip>
          <MetaChip icon={Ticket}>{t('hero.capacity')}</MetaChip>
        </div>
      </div>
    </section>
  )
}
