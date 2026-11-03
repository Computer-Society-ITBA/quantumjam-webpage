import { useTranslation } from 'react-i18next'

import { SectionHeading } from '@/components/landing/SectionHeading'

type Item = {
  key: 'hardware' | 'software' | 'support'
}

const items: Item[] = [
  { key: 'hardware' },
  { key: 'software' },
  { key: 'support' },
]

export function Qiskit() {
  const { t } = useTranslation()
  return (
    <section
      id="qiskit"
      className="border-brand-line relative z-10 border-b px-[clamp(20px,6vw,80px)] py-[clamp(40px,6vw,80px)]"
    >
      <SectionHeading index="03">{t('qiskit.title')}</SectionHeading>
      <p className="text-brand-text-dim max-w-[58ch] font-light">
        {t('qiskit.description')}
      </p>

      <ul className="border-brand-line bg-brand-line mt-8 grid grid-cols-1 gap-px border sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="bg-brand-panel p-6">
            <b className="font-display text-brand-green block text-[0.8rem] font-bold tracking-[0.1em] uppercase">
              {t(`qiskit.items.${item.key}.label`)}
            </b>
            <p className="text-brand-text-dim mt-1.5 max-w-[32ch] text-[0.85rem] font-light">
              {t(`qiskit.items.${item.key}.value`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
