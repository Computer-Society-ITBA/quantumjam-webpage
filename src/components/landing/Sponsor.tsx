import { useTranslation } from 'react-i18next'

import { IbmLogo } from '@/components/landing/IbmLogo'

type Item = {
  key: 'hardware' | 'software' | 'support'
}

const items: Item[] = [
  { key: 'hardware' },
  { key: 'software' },
  { key: 'support' },
]

export function Sponsor() {
  const { t } = useTranslation()
  return (
    <section
      id="sponsor"
      className="border-brand-line relative z-10 border-b px-[clamp(20px,6vw,80px)] py-[clamp(40px,6vw,80px)]"
    >
      <span className="text-brand-magenta-bright mb-2 block text-[1.05rem] font-medium tracking-[0.2em]">
        04
      </span>
      <h2 className="mb-[1.1rem]">
        <span className="sr-only">{t('sponsor.title')}</span>
        <IbmLogo aria-hidden="true" className="h-8 sm:h-10" />
      </h2>
      <p className="text-brand-text-dim max-w-[58ch] font-light">
        {t('sponsor.description')}
      </p>

      <ul className="border-brand-line bg-brand-line mt-8 grid grid-cols-1 gap-px border sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.key} className="bg-brand-panel p-6">
            <b className="font-display text-brand-green block text-[0.8rem] font-bold tracking-[0.1em] uppercase">
              {t(`sponsor.items.${item.key}.label`)}
            </b>
            <p className="text-brand-text-dim mt-1.5 max-w-[32ch] text-[0.85rem] font-light">
              {t(`sponsor.items.${item.key}.value`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
