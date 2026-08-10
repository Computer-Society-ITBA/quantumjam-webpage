import { useTranslation } from 'react-i18next'

export function Sponsor() {
  const { t } = useTranslation()
  return (
    <section className="relative z-10 px-[clamp(20px,6vw,80px)] py-[clamp(56px,9vw,120px)]">
      <h2 className="font-display text-foreground mb-[0.9rem] text-[clamp(1.5rem,3vw,2.15rem)] font-bold tracking-[0.01em]">
        {t('sponsor.title')}
      </h2>
      <p className="text-brand-text-dim mt-[0.4rem] max-w-[58ch]">
        {t('sponsor.description')}
      </p>
    </section>
  )
}
