import { useTranslation } from 'react-i18next'

import { SectionHeading } from '@/components/landing/SectionHeading'

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

function FeatureCard({ feature }: { feature: Feature }) {
  const { t } = useTranslation()
  return (
    <div className="bg-brand-panel flex h-full flex-col gap-3 p-7">
      <div className="text-brand-green font-display text-[1.1rem] font-extrabold">
        {feature.ket}
      </div>
      <h3 className="text-foreground font-medium tracking-tight">
        {t(feature.titleKey)}
      </h3>
      <p className="text-brand-text-dim max-w-[36ch] text-[0.85rem] font-light">
        {t(feature.descKey)}
      </p>
    </div>
  )
}

export function About() {
  const { t } = useTranslation()
  return (
    <section
      id="about"
      className="border-brand-line relative z-10 border-b px-[clamp(20px,6vw,80px)] py-[clamp(40px,6vw,80px)]"
    >
      <SectionHeading index="01">{t('about.title')}</SectionHeading>
      <p className="text-brand-text-dim max-w-[62ch] font-light">
        {t('about.description')}
      </p>

      <div className="border-brand-line bg-brand-line mt-12 grid grid-cols-1 gap-px border sm:grid-cols-3">
        {features.map((f) => (
          <FeatureCard key={f.ket} feature={f} />
        ))}
      </div>
    </section>
  )
}
