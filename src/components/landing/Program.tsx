import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionHeading } from '@/components/landing/SectionHeading'
import { SplitText } from '@/components/landing/SplitText'
import { Button } from '@/components/ui/button'
import { TALK_SIGNUP_URL, WORKSHOPS_REPO_URL } from '@/lib/links'
import { cn } from '@/lib/utils'

type Wire = 'workshops' | 'competition' | 'talks'

const AXIS_START = Date.UTC(2026, 9, 4)
const AXIS_END = Date.UTC(2026, 10, 21)

// Gates sit at their real dates along the run-up to competition day. The 5-95%
// range keeps the first gate and the measurement box inside the wire.
function axisLeft(month: number, day: number) {
  const progress =
    (Date.UTC(2026, month, day) - AXIS_START) / (AXIS_END - AXIS_START)
  return `${5 + progress * 90}%`
}

const WORKSHOP_GATES = [
  { label: '1', left: axisLeft(9, 4) },
  { label: '2', left: axisLeft(9, 11) },
  { label: '3', left: axisLeft(9, 18) },
  { label: '4', left: axisLeft(9, 25) },
]
const ENTANGLING_WORKSHOP_LEFT = WORKSHOP_GATES[1].left
const EXTRA_MATERIAL_LEFT = '78%'
const TALK_LEFT = axisLeft(10, 6)

const WIRE_ZONES: { wire: Wire; className: string }[] = [
  { wire: 'workshops', className: 'top-0 h-[68px]' },
  { wire: 'competition', className: 'top-[68px] h-[76px]' },
  { wire: 'talks', className: 'top-[144px] h-[112px]' },
]

const INFO_COLOR: Record<Wire, string> = {
  workshops: 'text-brand-magenta',
  competition: 'text-brand-green',
  talks: 'text-brand-cyan',
}

const gateClass =
  'font-display absolute top-4 flex size-7 -translate-x-1/2 items-center justify-center text-[0.85rem] font-extrabold md:top-2.5 md:size-10 md:text-[1.05rem]'

function CnotTarget({ left, className }: { left: string; className: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={cn(
        'absolute top-[92px] size-7 -translate-x-1/2 fill-[var(--brand-bg)] stroke-2',
        className,
      )}
      style={{ left }}
    >
      <circle cx="14" cy="14" r="12.5" />
      <path d="M14 2 V26 M2 14 H26" />
    </svg>
  )
}

function Bracket({
  side,
  className,
}: {
  side: 'bra' | 'ket'
  className: string
}) {
  const points = side === 'bra' ? '66,4 8,200 66,396' : '6,4 64,200 6,396'
  const layers = [
    '-translate-x-0.5 translate-y-px stroke-[var(--brand-cyan)] mix-blend-screen group-hover:-translate-x-1.5 group-hover:translate-y-0.5',
    'translate-x-0.5 -translate-y-px stroke-[var(--brand-magenta)] mix-blend-screen group-hover:translate-x-1.5 group-hover:-translate-y-0.5',
    'stroke-[var(--brand-collapse)]',
  ]
  return (
    <div aria-hidden="true" className={cn('relative', className)}>
      {layers.map((layer) => (
        <svg
          key={layer}
          viewBox="0 0 72 400"
          preserveAspectRatio="none"
          className={cn(
            'absolute inset-0 size-full fill-none transition-[translate] duration-[420ms] ease-out',
            layer,
          )}
        >
          <polyline
            points={points}
            strokeWidth="5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  )
}

function TalkDetail({ labelKey, valueKey }: Record<string, string>) {
  const { t } = useTranslation()
  return (
    <div className="flex items-baseline gap-2.5">
      <dt className="font-display text-foreground flex-[0_0_80px] text-[0.8rem] font-bold tracking-[0.05em] uppercase">
        {t(labelKey)}
      </dt>
      <dd className="text-brand-text-dim text-[0.875rem]">{t(valueKey)}</dd>
    </div>
  )
}

export function Program() {
  const { t } = useTranslation()
  const [active, setActive] = useState<Wire | null>(null)

  const dimmed = (wire: Wire) =>
    cn(
      'transition-opacity duration-[250ms]',
      active && active !== wire && 'opacity-30',
    )

  return (
    <section
      id="program"
      onMouseLeave={() => setActive(null)}
      className="border-brand-line relative z-10 border-b px-[clamp(20px,6vw,80px)] py-[clamp(40px,6vw,80px)]"
    >
      <div className="flex flex-col gap-x-12 gap-y-2 md:flex-row md:items-end md:justify-between">
        <SectionHeading index="02">{t('program.title')}</SectionHeading>
        <div
          aria-live="polite"
          className="mb-[1.1rem] flex min-h-[108px] flex-col md:min-h-[86px] md:flex-[0_1_460px] md:justify-end"
        >
          {active && (
            <>
              <span
                className={cn(
                  'font-display block text-[0.8rem] font-bold tracking-[0.1em] uppercase',
                  INFO_COLOR[active],
                )}
              >
                {t(`program.${active}.label`)}
              </span>
              <p className="text-brand-text-dim mt-1 text-[0.875rem] font-light">
                {t(`program.${active}.desc`)}
              </p>
              {active === 'workshops' && (
                <a
                  href={WORKSHOPS_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-magenta text-[0.875rem] underline"
                >
                  {t('program.workshops.notebooks')}
                </a>
              )}
            </>
          )}
        </div>
      </div>

      <div className="relative mt-6 h-[256px] md:pl-[136px]">
        <div
          aria-hidden="true"
          className="font-display text-[0.68rem] font-bold tracking-[0.06em] md:text-[0.8rem]"
        >
          <span
            className={cn(
              'text-brand-magenta absolute top-0 left-0 md:top-[19px]',
              dimmed('workshops'),
            )}
          >
            {t('program.workshops.ket')}
          </span>
          <span
            className={cn(
              // On a phone it sits under its wire: above it, the line from
              // workshop 2 would cut through the text.
              'text-brand-green absolute top-[122px] left-0 md:top-[95px]',
              dimmed('competition'),
            )}
          >
            {t('program.competition.ket')}
          </span>
          <span
            className={cn(
              'text-brand-cyan absolute top-[160px] left-0 md:top-[171px]',
              dimmed('talks'),
            )}
          >
            {t('program.talks.ket')}
          </span>
        </div>

        <div className="relative h-full">
          <div
            aria-hidden="true"
            className={cn('absolute inset-0', dimmed('competition'))}
          >
            <span
              className="absolute top-[106px] right-10 left-0 h-px md:right-14"
              style={{
                background:
                  'linear-gradient(90deg, var(--brand-magenta) 0%, #fff 58%, var(--brand-green) 100%)',
              }}
            />
            <span className="border-brand-green absolute top-[84px] right-0 flex h-11 w-10 items-center justify-center border-2 md:top-20 md:h-[52px] md:w-14">
              <svg viewBox="0 0 36 26" className="w-6 md:w-9">
                <path
                  d="M4 22 A14 14 0 0 1 32 22 M18 22 L27 6"
                  className="fill-none stroke-[var(--brand-green)] stroke-2"
                />
              </svg>
            </span>
          </div>

          <div
            aria-hidden="true"
            className={cn('absolute inset-0', dimmed('workshops'))}
          >
            <span className="bg-brand-magenta/45 absolute top-[30px] right-0 left-0 h-px" />
            <span
              className="bg-brand-magenta absolute top-[30px] h-[76px] w-0.5 -translate-x-1/2"
              style={{ left: ENTANGLING_WORKSHOP_LEFT }}
            />
            <CnotTarget
              left={ENTANGLING_WORKSHOP_LEFT}
              className="stroke-[var(--brand-magenta)]"
            />
            {WORKSHOP_GATES.map((gate) => (
              <span
                key={gate.label}
                className={cn(gateClass, 'bg-brand-magenta text-brand-bg')}
                style={{ left: gate.left }}
              >
                {gate.label}
              </span>
            ))}
            <span
              className={cn(
                gateClass,
                'border-brand-magenta bg-brand-bg text-brand-magenta border-2 border-dashed',
              )}
              style={{ left: EXTRA_MATERIAL_LEFT }}
            >
              +
            </span>
          </div>

          <div
            className={cn('absolute inset-0', dimmed('talks'))}
            style={{ '--talk-left': TALK_LEFT } as CSSProperties}
          >
            <span className="bg-brand-cyan/50 absolute top-[182px] right-0 left-0 h-px" />
            <span className="bg-brand-cyan absolute top-[106px] left-[var(--talk-left)] h-[100px] w-0.5 -translate-x-1/2" />
            <CnotTarget
              left={TALK_LEFT}
              className="stroke-[var(--brand-cyan)]"
            />
            <span
              className={cn(
                'bg-brand-cyan absolute top-[176px] left-[var(--talk-left)] size-3 -translate-x-1/2 transition-shadow duration-300',
                active === 'talks' && 'shadow-[0_0_0_5px_rgba(0,229,255,0.18)]',
              )}
            />
            {/* On a phone there is no room to the right of the node, so the
                tag anchors to the end of the wire instead. */}
            <span className="font-display bg-brand-cyan absolute top-[206px] right-0 flex min-h-11 items-center px-4 text-[0.8rem] font-bold tracking-[0.1em] whitespace-nowrap text-[#001317] uppercase md:right-auto md:left-[var(--talk-left)] md:-ml-px">
              {t('program.talks.tag')}
            </span>
          </div>
        </div>

        {/* Invisible row-wide targets, so a wire answers to hover, keyboard
            focus and touch anywhere along it, including its label. */}
        {WIRE_ZONES.map(({ wire, className }) => (
          <button
            key={wire}
            type="button"
            aria-label={t(`program.${wire}.label`)}
            onMouseEnter={() => setActive(wire)}
            onFocus={() => setActive(wire)}
            onClick={() => setActive(wire)}
            className={cn(
              'absolute left-0 w-full cursor-pointer focus-visible:-outline-offset-2',
              className,
            )}
          />
        ))}
      </div>

      {/* Stretched over a tall, narrow column the brackets flatten into near
          straight lines, so below lg they only wrap the speaker and the
          details follow underneath. */}
      <div className="group mt-8 grid grid-cols-[28px_minmax(0,1fr)_28px] lg:min-h-[360px] lg:grid-cols-[72px_minmax(0,1fr)_5px_minmax(0,1fr)_72px]">
        <Bracket side="bra" className="lg:col-start-1 lg:row-start-1" />
        <div className="flex min-w-0 flex-col justify-center px-4 py-5 md:px-10 lg:col-start-2 lg:row-start-1 lg:py-6">
          <h3
            className="font-display text-[clamp(3rem,7vw,5rem)] leading-[0.94] font-black tracking-[-0.03em] uppercase"
            style={{ fontVariationSettings: '"wdth" 90, "wght" 900' }}
          >
            <SplitText offset={3} className="max-w-[6ch]">
              {t('program.talks.speaker')}
            </SplitText>
          </h3>
          <p className="text-brand-text-dim mt-[18px] max-w-[28ch] text-[0.95rem] font-light">
            {t('program.talks.role')}
          </p>
        </div>
        <Bracket side="ket" className="lg:col-start-5 lg:row-start-1" />

        <div
          aria-hidden="true"
          className="bg-foreground hidden lg:col-start-3 lg:row-start-1 lg:block"
        />

        <div className="col-span-full flex min-w-0 flex-col justify-center pt-7 lg:col-span-1 lg:col-start-4 lg:row-start-1 lg:px-10 lg:py-6">
          <dl className="flex flex-col gap-3">
            <TalkDetail
              labelKey="program.talks.when_label"
              valueKey="program.talks.when"
            />
            <TalkDetail
              labelKey="program.talks.where_label"
              valueKey="program.talks.where"
            />
            <TalkDetail
              labelKey="program.talks.entry_label"
              valueKey="program.talks.entry"
            />
          </dl>
          <Button asChild variant="hero" size="cta" className="mt-6 self-start">
            <a href={TALK_SIGNUP_URL} target="_blank" rel="noopener noreferrer">
              {t('program.talks.cta')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
