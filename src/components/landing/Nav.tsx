import { useTranslation } from 'react-i18next'

function LogoMark() {
  return (
    <img
      src="/logo.png"
      alt="Computer Society ITBA"
      className="h-12 w-auto self-start object-contain"
    />
  )
}

export function Nav() {
  const { t } = useTranslation()

  return (
    <nav
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between px-[clamp(20px,6vw,80px)] pt-4 pb-20"
      style={{
        background:
          'linear-gradient(to bottom, rgba(13,10,6,0.92) 0%, rgba(13,10,6,0.65) 40%, rgba(13,10,6,0) 100%)',
      }}
    >
      <a
        href="#"
        aria-label={t('nav.brand')}
        className="pointer-events-auto flex items-center"
      >
        <LogoMark />
      </a>
      <a
        href="#inscripcion"
        className="border-brand-warm text-foreground hover:bg-brand-warm pointer-events-auto inline-flex rounded-full border px-[18px] py-[9px] text-[0.78rem] font-medium tracking-wide transition-colors duration-200 hover:text-[#1a1206] hover:shadow-[0_0_22px_-4px_var(--brand-warm)]"
      >
        {t('nav.cta')}
      </a>
    </nav>
  )
}

export { LogoMark }
