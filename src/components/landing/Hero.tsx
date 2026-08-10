import { useEffect, useState } from 'react'
import { Calendar, ChevronDown, MapPin, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-brand-text-dim mb-4 inline-flex items-center gap-[0.6em] text-[0.72rem] tracking-[0.16em] uppercase">
      <span className="animate-pulse-dot bg-brand-blue h-[6px] w-[6px] rounded-full shadow-[0_0_8px_2px_rgba(126,196,221,0.6)]" />
      {children}
    </p>
  )
}

function IbmBadge() {
  return (
    <span className="border-brand-line text-foreground inline-flex items-center gap-1.5 rounded-full border py-[5px] pr-3 pl-2 font-semibold">
      <span className="flex h-3 items-end gap-[2px]">
        <span className="bg-brand-blue block h-[5px] w-[2px]" />
        <span className="bg-brand-blue block h-[9px] w-[2px]" />
        <span className="bg-brand-blue block h-[12px] w-[2px]" />
        <span className="bg-brand-blue block h-[7px] w-[2px]" />
      </span>
      IBM Quantum
    </span>
  )
}

function MetaChip({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar
  children: React.ReactNode
}) {
  return (
    <span className="border-brand-line text-brand-text-dim inline-flex items-center gap-2 rounded-md border px-[14px] py-2 text-[0.78rem]">
      <Icon className="text-brand-gold-bright size-4" strokeWidth={1.8} />
      <b className="text-foreground font-medium">{children}</b>
    </span>
  )
}

function Title() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={cn(
        'title-wrap relative isolate mb-[1.1rem]',
        collapsed && 'collapsed',
      )}
      onTouchStart={() => setCollapsed((v) => !v)}
    >
      <h1 className="font-display cursor-default text-center text-[clamp(2.8rem,10vw,7.4rem)] leading-none font-bold tracking-[0.01em]">
        <span className="grid place-items-center">
          <span className="title-ghost a col-start-1 row-start-1">
            QuantumJam
          </span>
          <span className="title-ghost b col-start-1 row-start-1">
            QuantumJam
          </span>
          <span className="title-main col-start-1 row-start-1">QuantumJam</span>
        </span>
      </h1>
    </div>
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
    <section className="relative flex min-h-[94vh] flex-col items-center justify-center px-[clamp(20px,6vw,80px)] pt-[60px] pb-[clamp(56px,9vw,120px)] text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-10%] left-1/2 z-0 h-[640px] w-[min(1000px,92vw)] -translate-x-1/2 blur-[30px]"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(201,151,79,.22), transparent 55%),radial-gradient(circle at 70% 40%, rgba(126,196,221,.08), transparent 55%),radial-gradient(circle at 50% 70%, rgba(184,137,74,.14), transparent 55%)',
        }}
      />

      <Settle delay={0.05}>
        <Eyebrow>{t('hero.eyebrow')}</Eyebrow>
      </Settle>

      <Settle delay={0.15}>
        <Title />
      </Settle>

      <Settle delay={0.25}>
        <p className="text-brand-text-dim mx-auto mb-[1.8rem] max-w-[46ch] text-[clamp(1rem,1.5vw,1.15rem)]">
          {t('hero.subtitle')}
        </p>
      </Settle>

      <Settle delay={0.32}>
        <div className="text-brand-text-dim mb-8 flex items-center justify-center gap-[10px] text-[0.78rem]">
          <span>{t('hero.sponsored_by')}</span>
          <IbmBadge />
        </div>
      </Settle>

      <Settle delay={0.4}>
        <div className="mb-[2.4rem] flex flex-wrap justify-center gap-3">
          <MetaChip icon={Calendar}>{t('hero.date')}</MetaChip>
          <MetaChip icon={MapPin}>{t('hero.place')}</MetaChip>
          <MetaChip icon={Ticket}>{t('hero.capacity')}</MetaChip>
        </div>
      </Settle>

      <Settle delay={0.48}>
        <Button asChild variant="hero" size="cta">
          <a href="#inscripcion">{t('hero.cta')}</a>
        </Button>
      </Settle>

      <Settle delay={0.6}>
        <div className="text-brand-text-dim animate-hint mt-[2.6rem]">
          <ChevronDown
            className="size-5"
            strokeWidth={1.6}
            aria-hidden="true"
          />
        </div>
      </Settle>
    </section>
  )
}
