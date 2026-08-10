import { useTranslation } from 'react-i18next'

type Feature = {
  ket: string
  titleKey: string
  descKey: string
}

const features: Feature[] = [
  {
    ket: '|0⟩',
    titleKey: 'about.features.beginner.title',
    descKey: 'about.features.beginner.desc',
  },
  {
    ket: '|1⟩',
    titleKey: 'about.features.hands_on.title',
    descKey: 'about.features.hands_on.desc',
  },
  {
    ket: '|+⟩',
    titleKey: 'about.features.community.title',
    descKey: 'about.features.community.desc',
  },
]

function FeatureRow({ feature }: { feature: Feature }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-4">
      <div className="border-brand-line text-brand-gold-bright flex h-[38px] w-10 flex-shrink-0 items-center justify-center rounded-md border text-[0.82rem] font-semibold">
        {feature.ket}
      </div>
      <div>
        <h3 className="text-foreground mb-1 font-semibold">
          {t(feature.titleKey)}
        </h3>
        <p className="text-brand-text-dim max-w-[58ch] text-[0.88rem]">
          {t(feature.descKey)}
        </p>
      </div>
    </div>
  )
}

export function About() {
  const { t } = useTranslation()
  return (
    <section className="relative z-10 px-[clamp(20px,6vw,80px)] py-[clamp(56px,9vw,120px)]">
      <p className="text-brand-text-dim mb-4 inline-flex items-center gap-[0.6em] text-[0.72rem] tracking-[0.16em] uppercase">
        <span className="animate-pulse-dot bg-brand-blue h-[6px] w-[6px] rounded-full shadow-[0_0_8px_2px_rgba(126,196,221,0.6)]" />
        {t('about.eyebrow')}
      </p>
      <div className="mt-[1.6rem] grid grid-cols-1 items-start gap-14 md:grid-cols-2">
        <div>
          <h2 className="font-display text-foreground mb-[0.9rem] text-[clamp(1.5rem,3vw,2.15rem)] font-bold tracking-[0.01em]">
            {t('about.title')}
          </h2>
          <p className="text-brand-text-dim max-w-[58ch]">
            {t('about.description')}
          </p>
        </div>
        <div className="flex flex-col gap-[22px]">
          {features.map((f) => (
            <FeatureRow key={f.ket} feature={f} />
          ))}
        </div>
      </div>
    </section>
  )
}
