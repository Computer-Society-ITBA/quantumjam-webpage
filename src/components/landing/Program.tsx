import { useTranslation } from 'react-i18next'

function BlochSphere() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      className="mx-auto block w-full max-w-[260px]"
    >
      <circle
        cx="100"
        cy="100"
        r="70"
        stroke="var(--brand-line)"
        strokeWidth="1"
      />
      <ellipse
        cx="100"
        cy="100"
        rx="70"
        ry="22"
        stroke="var(--brand-warm)"
        strokeWidth="1"
        className="animate-bloch-ring origin-[100px_100px]"
      />
      <ellipse
        cx="100"
        cy="100"
        rx="22"
        ry="70"
        stroke="var(--brand-blue)"
        strokeWidth="1"
        className="animate-bloch-ring-reverse origin-[100px_100px]"
      />
      <line
        x1="100"
        y1="30"
        x2="100"
        y2="170"
        stroke="var(--brand-line)"
        strokeWidth="1"
      />
      <circle cx="100" cy="30" r="3" fill="var(--brand-gold-bright)" />
      <circle cx="100" cy="170" r="3" fill="var(--brand-gold-bright)" />
      <line
        x1="100"
        y1="100"
        x2="150"
        y2="58"
        stroke="var(--brand-gold-bright)"
        strokeWidth="1.6"
      />
      <circle cx="150" cy="58" r="4" fill="var(--brand-gold-bright)" />
      <circle cx="100" cy="100" r="2.4" fill="var(--brand-text)" />
    </svg>
  )
}

type Item = {
  ket: string
  titleKey: string
  descKey: string
  timeKey: string
  placeKey: string
}

const items: Item[] = [
  {
    ket: '|0⟩',
    titleKey: 'program.items.fundamentals.title',
    descKey: 'program.items.fundamentals.desc',
    timeKey: 'program.items.fundamentals.time',
    placeKey: 'program.items.fundamentals.place',
  },
  {
    ket: '|1⟩',
    titleKey: 'program.items.workshop.title',
    descKey: 'program.items.workshop.desc',
    timeKey: 'program.items.workshop.time',
    placeKey: 'program.items.workshop.place',
  },
  {
    ket: '|ψ⟩',
    titleKey: 'program.items.panel.title',
    descKey: 'program.items.panel.desc',
    timeKey: 'program.items.panel.time',
    placeKey: 'program.items.panel.place',
  },
]

function KetCard({ item }: { item: Item }) {
  const { t } = useTranslation()
  return (
    <article className="bg-brand-panel border-brand-line hover:border-brand-warm relative overflow-hidden rounded-lg border px-6 py-7 transition-[border-color,transform] duration-300 hover:translate-x-1">
      <span className="text-brand-gold-bright mb-3 block text-[1.35rem] font-bold">
        {item.ket}
      </span>
      <h3 className="text-foreground mb-1.5">{t(item.titleKey)}</h3>
      <p className="text-brand-text-dim mb-3 max-w-[58ch] text-[0.88rem]">
        {t(item.descKey)}
      </p>
      <span className="flex items-baseline gap-[10px] text-[0.72rem]">
        <span className="text-brand-gold-bright font-semibold">
          {t(item.timeKey)}
        </span>
        <span className="text-brand-text-dim">{t(item.placeKey)}</span>
      </span>
    </article>
  )
}

export function Program() {
  const { t } = useTranslation()
  return (
    <section className="relative z-10 px-[clamp(20px,6vw,80px)] py-[clamp(56px,9vw,120px)]">
      <h2 className="text-foreground mb-[0.9rem] text-[clamp(1.5rem,3vw,2.15rem)] font-semibold tracking-tight">
        {t('program.title')}
      </h2>
      <div className="mt-[1.8rem] grid grid-cols-1 gap-14 md:grid-cols-[0.8fr_1.2fr]">
        <div className="static self-start md:sticky md:top-[100px]">
          <BlochSphere />
        </div>
        <div className="flex flex-col gap-[22px]">
          {items.map((it) => (
            <KetCard key={it.ket} item={it} />
          ))}
        </div>
      </div>
    </section>
  )
}
