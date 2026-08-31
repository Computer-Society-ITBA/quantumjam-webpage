import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BackLink } from '@/components/registration/BackLink'
import { Footer } from '@/components/landing/Footer'
import { cn } from '@/lib/utils'

type EventOption = {
  event: 'workshops' | 'competition'
  accent: 'magenta' | 'green'
}

const options: EventOption[] = [
  { event: 'workshops', accent: 'magenta' },
  { event: 'competition', accent: 'green' },
]

function EventRow({ option }: { option: EventOption }) {
  const { t } = useTranslation()
  const isMagenta = option.accent === 'magenta'
  return (
    <Link
      to={`/register/${option.event}`}
      className="group flex items-start gap-5 py-6"
    >
      <div
        className={cn(
          'font-display mt-0.5 flex h-[38px] w-10 flex-shrink-0 items-center justify-center border-2 text-[0.82rem] font-extrabold transition-colors',
          isMagenta
            ? 'border-brand-magenta-bright/50 text-brand-magenta-bright group-hover:bg-brand-magenta-bright/10'
            : 'border-brand-green/50 text-brand-green group-hover:bg-brand-green/10',
        )}
      >
        {t(`registerSelect.${option.event}.ket`)}
      </div>
      <div className="flex-1">
        <h2
          className={cn(
            'text-foreground mb-1 text-[1.05rem] font-medium transition-colors',
            isMagenta
              ? 'group-hover:text-brand-magenta-bright'
              : 'group-hover:text-brand-green',
          )}
        >
          {t(`registerSelect.${option.event}.title`)}
        </h2>
        <p className="text-brand-text-dim max-w-[46ch] text-[0.9rem] font-light">
          {t(`registerSelect.${option.event}.desc`)}
        </p>
      </div>
      <span
        className={cn(
          'font-display mt-1 flex-shrink-0 text-[0.78rem] font-bold tracking-[0.06em] uppercase',
          isMagenta ? 'text-brand-magenta-bright' : 'text-brand-green',
        )}
      >
        {t(`registerSelect.${option.event}.mode`)}
      </span>
    </Link>
  )
}

export default function RegisterSelectPage() {
  const { t } = useTranslation()
  return (
    <>
      <BackLink to="/" label={t('registerSelect.backHome')} />
      <main className="relative z-10 flex min-h-screen flex-col justify-center px-[clamp(20px,6vw,80px)] pt-20 pb-16">
        <div className="mx-auto w-full max-w-[620px]">
          <h1
            className="font-display text-foreground mb-[0.9rem] text-[clamp(1.6rem,3.4vw,2.3rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
            style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
          >
            {t('registerSelect.title')}
          </h1>
          <p className="text-brand-text-dim mb-4 max-w-[52ch] font-light">
            {t('registerSelect.description')}
          </p>
          <div className="border-brand-line divide-brand-line divide-y border-y">
            {options.map((o) => (
              <EventRow key={o.event} option={o} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
