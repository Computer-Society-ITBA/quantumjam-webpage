import { useTranslation } from 'react-i18next'

import { SectionHeading } from '@/components/landing/SectionHeading'
import { cn } from '@/lib/utils'

function ArrowHead({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 6 10"
      aria-hidden="true"
      className={cn('h-2.5 w-1.5 flex-shrink-0', flip && 'rotate-180')}
    >
      <path d="M0 0 L6 5 L0 10 Z" fill="var(--brand-magenta)" />
    </svg>
  )
}

export function Program() {
  const { t } = useTranslation()
  return (
    <section
      id="program"
      className="border-brand-line relative z-10 border-b px-[clamp(20px,6vw,80px)] py-[clamp(40px,6vw,80px)]"
    >
      <SectionHeading index="02">{t('program.title')}</SectionHeading>

      <div className="relative z-10 mt-12 md:mt-16">
        <div className="flex items-start justify-between gap-8">
          <div>
            <span className="font-display text-brand-magenta-bright block text-[0.8rem] font-bold tracking-[0.1em] uppercase">
              {t('program.workshops.label')}
            </span>
            <p className="text-brand-text-dim mt-1 max-w-[34ch] text-[0.85rem] font-light">
              {t('program.workshops.desc')}
            </p>
          </div>
          <div className="text-right">
            <span className="font-display text-brand-green block text-[0.8rem] font-bold tracking-[0.1em] uppercase">
              {t('program.competition.label')}
            </span>
            <p className="text-brand-text-dim mt-1 max-w-[28ch] text-[0.85rem] font-light">
              {t('program.competition.desc')}
            </p>
          </div>
        </div>

        {/* The workshops run across the whole run-up to competition day, so
            their span is drawn as a delimited stretch of the timeline rather
            than as discrete points. */}
        <div className="mt-9 flex items-center gap-1.5 pr-8">
          <ArrowHead flip />
          <span className="bg-brand-magenta/40 h-px flex-1" />
          <ArrowHead />
        </div>

        <div
          className="relative mt-3 h-px"
          style={{
            background:
              'linear-gradient(90deg, var(--brand-magenta) 0%, #fff 58%, var(--brand-green) 100%)',
          }}
        >
          <span className="bg-brand-magenta absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2" />
          <span className="bg-brand-green border-background absolute top-1/2 right-0 h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 border-2" />
        </div>

        <div className="mt-3.5 flex justify-between text-[0.72rem]">
          <span className="text-brand-text-dim">{t('program.now')}</span>
          <span className="text-brand-green">{t('hero.date')}</span>
        </div>
      </div>
    </section>
  )
}
