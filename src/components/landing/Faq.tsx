import { useId, useState, type ReactNode } from 'react'
import { Calendar, Laptop, MapPin, Plug } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { EmailIcon, InstagramIcon } from '@/components/landing/Footer'
import { SectionHeading } from '@/components/landing/SectionHeading'
import { Button } from '@/components/ui/button'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/links'
import { cn } from '@/lib/utils'

type Extra = 'sessions' | 'venue' | 'packing' | 'register'

type Item = {
  key: string
  extra?: Extra
}

const items: Item[] = [
  { key: 'what' },
  { key: 'experience' },
  { key: 'coding' },
  { key: 'non_itba' },
  { key: 'team' },
  { key: 'pre_jam', extra: 'sessions' },
  { key: 'workshops_required' },
  { key: 'when_where', extra: 'venue' },
  { key: 'packing', extra: 'packing' },
  { key: 'register', extra: 'register' },
]

// Questions are numbered as 4-qubit basis states (|0000⟩ to |1001⟩),
// continuing the |0⟩ |1⟩ |+⟩ labels used in About.
function ket(index: number) {
  return `|${index.toString(2).padStart(4, '0')}⟩`
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar
  children: ReactNode
}) {
  return (
    <span className="border-brand-line text-brand-text-dim inline-flex items-center gap-2 border-2 px-[14px] py-2 text-[0.72rem] tracking-[0.08em]">
      <Icon className="text-brand-green size-4" strokeWidth={1.8} />
      <b className="text-foreground font-medium">{children}</b>
    </span>
  )
}

function SessionsTrack() {
  const { t } = useTranslation()
  return (
    <div className="mt-6 max-w-[460px]">
      <div className="flex justify-between gap-4 text-[0.72rem] tracking-[0.04em]">
        <span className="text-brand-magenta">{t('faq.sessions.start')}</span>
        <span className="text-brand-green">{t('faq.sessions.end')}</span>
      </div>
      <div
        aria-hidden="true"
        className="relative mt-2.5 flex h-3.5 items-center justify-between"
      >
        <span
          className="absolute inset-x-0 top-1/2 h-px"
          style={{
            background:
              'linear-gradient(90deg, var(--brand-magenta) 0%, #fff 58%, var(--brand-green) 100%)',
          }}
        />
        <span className="bg-brand-magenta relative size-2" />
        <span className="relative size-2 bg-[#ff9ad8]" />
        <span className="relative size-2 bg-white" />
        <span className="bg-brand-green relative size-2.5" />
      </div>
      <div
        aria-hidden="true"
        className="font-display text-brand-text-faint mt-2 flex justify-between text-[0.68rem] font-bold tracking-[0.08em]"
      >
        <span>01</span>
        <span>02</span>
        <span>03</span>
        <span>04</span>
      </div>
    </div>
  )
}

function ItemExtra({ extra }: { extra: Extra }) {
  const { t } = useTranslation()
  switch (extra) {
    case 'sessions':
      return <SessionsTrack />
    case 'venue':
      return (
        <div className="mt-[18px] flex flex-wrap gap-2">
          <Chip icon={Calendar}>{t('hero.date')}</Chip>
          <Chip icon={MapPin}>{t('hero.place')}</Chip>
        </div>
      )
    case 'packing':
      return (
        <div className="mt-[18px] flex flex-wrap gap-2">
          <Chip icon={Laptop}>{t('faq.packing.laptop')}</Chip>
          <Chip icon={Plug}>{t('faq.packing.charger')}</Chip>
        </div>
      )
    case 'register':
      return (
        <Button asChild variant="hero" size="cta" className="mt-5">
          <Link to="/register">{t('faq.cta')}</Link>
        </Button>
      )
  }
}

function FaqRow({
  item,
  index,
  open,
  onToggle,
}: {
  item: Item
  index: number
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const id = useId()
  const buttonId = `${id}-q`
  const panelId = `${id}-a`

  return (
    <div
      className={cn(
        'border-brand-line border-b transition-colors duration-300',
        open && 'bg-brand-panel',
      )}
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group grid min-h-[76px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_36px] items-center gap-4 px-4 py-[18px] text-left sm:grid-cols-[88px_minmax(0,1fr)_36px] sm:px-6 sm:py-5"
        >
          <span
            aria-hidden="true"
            className={cn(
              'font-display hidden text-[0.9rem] font-extrabold tracking-[0.02em] transition-colors duration-300 sm:block',
              open ? 'text-brand-green' : 'text-brand-text-faint',
            )}
          >
            {ket(index)}
          </span>
          <span className="text-foreground text-[1.08rem] leading-[1.4] font-normal">
            {t(`faq.items.${item.key}.q`)}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'relative size-9 border-2 transition-colors duration-300',
              open
                ? 'border-brand-green text-brand-green'
                : 'border-brand-line text-foreground group-hover:border-brand-green',
            )}
          >
            <span className="absolute top-1/2 left-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 bg-current" />
            <span
              className={cn(
                'absolute top-1/2 left-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-current transition-transform duration-300',
                open && 'scale-y-0',
              )}
            />
          </span>
        </button>
      </h3>
      {/* Animating grid-template-rows between 0fr and 1fr lets the panel
          open to its natural height without measuring it. `inert` keeps
          the collapsed answer out of the tab order and the a11y tree. */}
      <div
        id={panelId}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-6 sm:pr-[76px] sm:pb-7 sm:pl-[128px]">
            <p className="text-brand-text-dim max-w-[62ch] text-[0.95rem] leading-[1.65] font-light">
              {t(`faq.items.${item.key}.a`)}
            </p>
            {item.extra && <ItemExtra extra={item.extra} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactCard({ className }: { className?: string }) {
  const { t } = useTranslation()
  const email = t('footer.links.email')
  const linkClass =
    'border-brand-line text-brand-text-dim hover:border-brand-green hover:text-foreground inline-flex min-h-11 items-center gap-2 border-2 px-[14px] py-2 text-[0.72rem] tracking-[0.06em] transition-colors'

  return (
    <div
      className={cn(
        'bg-brand-panel border-brand-line flex flex-col gap-3 border p-7',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="font-display text-brand-green text-[1.1rem] font-extrabold"
      >
        |?⟩
      </span>
      <h3 className="text-foreground font-medium tracking-tight">
        {t('faq.contact.title')}
      </h3>
      <p className="text-brand-text-dim text-[0.85rem] font-light">
        {t('faq.contact.desc')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={INSTAGRAM_URL} className={linkClass}>
          <span aria-hidden="true" className="text-brand-green">
            <InstagramIcon />
          </span>
          <b className="text-foreground font-medium">{INSTAGRAM_HANDLE}</b>
        </a>
        <a href={`mailto:${email}`} className={linkClass}>
          <span aria-hidden="true" className="text-brand-green">
            <EmailIcon />
          </span>
          <b className="text-foreground font-medium">{email}</b>
        </a>
      </div>
    </div>
  )
}

export function Faq() {
  const { t } = useTranslation()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="border-brand-line relative z-10 border-b px-[clamp(20px,6vw,80px)] py-[clamp(40px,6vw,80px)]"
    >
      {/* DOM order is heading, questions, contact so the contact card
          comes last on mobile and for screen readers; on desktop the grid
          lifts it into the left column under the heading. */}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-[72px] lg:gap-y-10">
        <div className="lg:col-start-1 lg:row-start-1">
          <SectionHeading index="05">{t('faq.title')}</SectionHeading>
        </div>
        <div className="border-brand-line min-w-0 border-t lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {items.map((item, index) => (
            <FaqRow
              key={item.key}
              item={item}
              index={index}
              open={open === index}
              onToggle={() => setOpen(open === index ? null : index)}
            />
          ))}
        </div>
        <ContactCard className="lg:sticky lg:top-10 lg:col-start-1 lg:row-start-2 lg:self-start" />
      </div>
    </section>
  )
}
