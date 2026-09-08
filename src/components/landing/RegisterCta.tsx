import { Handshake } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { HeroField } from '@/components/landing/HeroField'

export function RegisterCta() {
  const { t } = useTranslation()
  return (
    <section className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-[clamp(20px,6vw,80px)] py-[clamp(80px,14vw,180px)] text-center">
      <HeroField glow={1.7} />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 50%, rgba(7,7,7,0) 0%, rgba(7,7,7,0.55) 55%, var(--brand-bg) 92%)',
        }}
      />
      <div>
        <h2
          className="font-display text-foreground relative z-10 mx-auto mb-9 max-w-[24ch] text-[clamp(2.2rem,6vw,4.2rem)] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase"
          style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
        >
          {t('registerCta.title')}
        </h2>
        <Button
          asChild
          variant="hero"
          size="cta"
          className="bg-brand-bg/85 relative z-10 h-14 px-11 text-[0.88rem]"
        >
          <Link to="/register">{t('registerCta.cta')}</Link>
        </Button>
      </div>
      <Link
        to="/sponsor"
        className="border-brand-line bg-brand-bg/85 text-brand-text-dim hover:border-brand-green hover:text-foreground absolute bottom-[clamp(28px,5vw,56px)] left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 border-2 px-[14px] py-2 text-[0.7rem] tracking-[0.1em] transition-colors"
      >
        <Handshake className="text-brand-green size-4" strokeWidth={1.8} />
        <b className="text-foreground font-medium">
          {t('registerCta.sponsorPrompt')}
        </b>
      </Link>
    </section>
  )
}
