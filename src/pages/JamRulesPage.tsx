import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BolsaTitle } from '@/pages/JamMarketPage'

// Section keys under jam.rules.sections, in reading order.
const SECTIONS = [
  'what',
  'join',
  'price',
  'moves',
  'trade',
  'finalists',
  'close',
  'win',
] as const

/** How the Bolsa de Compys works: rules, price movement and how to win. */
export default function JamRulesPage() {
  const { t } = useTranslation()
  return (
    <main className="relative z-10 min-h-screen px-[clamp(16px,5vw,64px)] py-8">
      <div className="mx-auto w-full max-w-[680px]">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <BolsaTitle size="bar" />
          <Link
            to="/jam"
            className="border-brand-line hover:border-brand-text-faint h-9 border px-3.5 text-[0.85rem] leading-9 transition-colors"
          >
            {t('jam.rules.back')}
          </Link>
        </header>

        <h2
          className="font-display mb-8 text-[1.9rem] leading-tight font-extrabold"
          style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
        >
          {t('jam.rules.title')}
        </h2>

        <div className="flex flex-col gap-8">
          {SECTIONS.map((key) => (
            <section key={key}>
              <h3 className="mb-2 text-[1.05rem] font-semibold">
                {t(`jam.rules.sections.${key}.title`)}
              </h3>
              <p className="text-brand-text-dim text-[0.98rem] leading-relaxed">
                {t(`jam.rules.sections.${key}.body`)}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
