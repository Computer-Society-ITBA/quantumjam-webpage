import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { BackLink } from '@/components/registration/BackLink'
import { Footer } from '@/components/landing/Footer'
import { GradientBackdrop } from '@/components/landing/GradientBackdrop'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * The "collapse" headline effect: two ghost copies (cyan + magenta) offset
 * a few px behind a solid white top layer, screen-blended. Drift animation
 * is shared with the hero wordmark. Reserved for the 404 digits.
 */
function SplitText({
  children,
  offset = 6,
  className,
  style,
}: {
  children: ReactNode
  offset?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span className={cn('rgb-split', className)} style={style}>
      <span
        aria-hidden="true"
        className="rgb-split-ghost text-brand-cyan"
        style={{ transform: `translate(${-offset}px, ${offset * 0.5}px)` }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className="rgb-split-ghost text-brand-magenta"
        style={{ transform: `translate(${offset}px, ${-offset * 0.5}px)` }}
      >
        {children}
      </span>
      <span className="text-brand-collapse relative">{children}</span>
    </span>
  )
}

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <>
      <BackLink to="/" label={t('notFound.backHome')} />
      <main className="border-brand-line relative flex min-h-screen flex-col items-center justify-center overflow-hidden border-b px-[clamp(20px,6vw,80px)] py-[clamp(80px,10vh,140px)] text-center">
        <GradientBackdrop
          vignette
          className="h-[900px] w-[min(1400px,98vw)]"
          glow={2.2}
          dim={1}
        />

        <div className="relative z-10 flex max-w-[560px] flex-col items-center">
          <h1 className="font-display bg-brand-bg/85 mb-5 inline-block px-3 py-1">
            <SplitText
              offset={8}
              className="text-[clamp(4rem,20vw,10rem)] leading-[0.86] font-black tracking-[-0.03em]"
              style={{ fontVariationSettings: '"wdth" 112, "wght" 900' }}
            >
              404
            </SplitText>
          </h1>

          <p className="bg-brand-bg/85 text-brand-text-dim mb-8 inline-block max-w-[42ch] px-3 py-1.5 text-[clamp(1rem,1.5vw,1.15rem)] font-light">
            {t('notFound.description')}
          </p>

          <Button asChild variant="hero" size="cta">
            <Link to="/">{t('notFound.cta')}</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  )
}
