import { useTranslation } from 'react-i18next'

function LogoMark() {
  return (
    <span className="text-brand-text-dim font-display text-[1.05rem] tracking-[0.02em]">
      0<span className="text-brand-gold-bright text-[1.3em] font-bold">Φ</span>1
    </span>
  )
}

export function Nav() {
  const { t } = useTranslation()

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between bg-[rgba(13,10,6,0.78)] px-[clamp(20px,6vw,80px)] py-4 backdrop-blur-[10px]">
      <div className="text-brand-text-dim flex items-center gap-[10px] text-[0.85rem]">
        <LogoMark />
        <span className="text-foreground font-semibold whitespace-nowrap">
          {t('nav.brand')}
        </span>
      </div>
      <a
        href="#inscripcion"
        className="border-brand-warm text-foreground hover:bg-brand-warm inline-flex rounded-full border px-[18px] py-[9px] text-[0.78rem] font-medium tracking-wide transition-colors duration-200 hover:text-[#1a1206] hover:shadow-[0_0_22px_-4px_var(--brand-warm)]"
      >
        {t('nav.cta')}
      </a>
    </nav>
  )
}

export { LogoMark }
