import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { GradientBackdrop } from '@/components/landing/GradientBackdrop'

export function RegisterCta() {
  const { t } = useTranslation()
  return (
    <section className="relative z-10 overflow-hidden px-[clamp(20px,6vw,80px)] py-[clamp(80px,14vw,180px)] text-center">
      <GradientBackdrop
        vignette
        className="h-[760px] w-[min(1300px,96vw)]"
        glow={2}
        dim={0.95}
      />
      <h2
        className="font-display text-foreground relative mx-auto mb-9 max-w-[24ch] text-[clamp(2.2rem,6vw,4.2rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase"
        style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
      >
        {t('registerCta.title')}
      </h2>
      <Button
        asChild
        variant="hero"
        size="cta"
        className="relative h-14 px-11 text-[0.88rem]"
      >
        <Link to="/register">{t('registerCta.cta')}</Link>
      </Button>
    </section>
  )
}
