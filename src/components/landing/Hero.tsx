import { useEffect, useState } from 'react'
import { Calendar, MapPin, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import quantumJamLogo from '@/assets/quantum-jam-logo-primary.svg?raw'
import { HeroField } from '@/components/landing/HeroField'
import { IbmLogo } from '@/components/landing/IbmLogo'
import { cn } from '@/lib/utils'
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
    <span className="border-brand-line bg-brand-bg/85 text-brand-text-dim inline-flex items-center gap-2 border-2 px-[14px] py-2 text-[0.7rem] tracking-[0.1em]">
      <Icon className="text-brand-green size-4" strokeWidth={1.8} />
      <b className="text-foreground font-medium">{children}</b>
    </span>
  )
}

function IbmBadge() {
  return (
    <span className="border-brand-line bg-brand-bg/85 inline-flex items-center border-2 px-[18px] pt-2.5 pb-2">
      <IbmLogo className="h-[14px]" />
    </span>
  )
}

function useSettle() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready
}

type SettleProps = {
  delay?: number
  className?: string
  children: React.ReactNode
}

function Settle({ delay = 0, className, children }: SettleProps) {
  const ready = useSettle()
  return (
    <div
      className={cn('settle', ready && 'in', className)}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
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
        <Settle delay={0.05}>
          <div className="bg-brand-bg/85 text-brand-text-dim inline-flex items-center gap-[10px] px-3 py-1.5 text-[0.8rem]">
            <span>{t('hero.sponsored_by')}</span>
            <IbmBadge />
          </div>
        </Settle>

        <Settle delay={0.15} className="w-full">
          <h1
            aria-label={t('nav.brand')}
            className="hero-wordmark mx-auto mb-5 w-[clamp(240px,70vw,760px)] -translate-y-2"
            dangerouslySetInnerHTML={{ __html: heroWordmarkSvg }}
          />
        </Settle>

        <Settle delay={0.25}>
          <p className="bg-brand-bg/85 text-brand-text-dim mx-auto mb-6 inline-block max-w-[46ch] px-3 py-1.5 text-[clamp(1rem,1.5vw,1.15rem)] font-light">
            {t('hero.subtitle')}
          </p>
        </Settle>

        <Settle delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <MetaChip icon={Calendar}>{t('hero.date')}</MetaChip>
            <MetaChip icon={MapPin}>{t('hero.place')}</MetaChip>
            <MetaChip icon={Ticket}>{t('hero.capacity')}</MetaChip>
          </div>
        </Settle>
      </div>
    </section>
  )
}
