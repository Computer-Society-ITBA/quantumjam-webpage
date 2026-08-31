import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { LogoMark } from '@/components/landing/Nav'

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="7.5" y1="10" x2="7.5" y2="16.5" />
      <circle cx="7.5" cy="7" r="1" />
      <path d="M11.5 16.5V10M11.5 12.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v4" />
    </svg>
  )
}

function YoutubeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <rect x="3" y="5.5" width="18" height="13" rx="4" />
      <path d="M10.3 9.3l5 2.7-5 2.7z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Social({
  href,
  labelKey,
  icon,
}: {
  href: string
  labelKey: string
  icon: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <a
      href={href}
      aria-label={t(labelKey)}
      className="text-brand-text-dim hover:text-brand-green flex size-6 items-center justify-center transition-colors duration-200"
    >
      {icon}
    </a>
  )
}

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="bg-brand-panel border-brand-line relative z-10 border-t px-[clamp(20px,6vw,80px)] pt-[60px] pb-7">
      <div className="flex flex-wrap justify-between gap-12 pb-9">
        <div className="flex max-w-[300px] flex-col gap-3">
          <a
            href="https://www.csitba.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <LogoMark />
          </a>

          <p className="text-brand-text-dim text-[0.82rem] font-light">
            {t('footer.brand_desc')}
          </p>
          <div className="-ml-[3px] flex gap-4">
            <Social
              href="https://www.instagram.com/computer.society.itba/"
              labelKey="a11y.instagram"
              icon={<InstagramIcon />}
            />
            <Social
              href="mailto:computersociety@itba.edu.ar"
              labelKey="a11y.email"
              icon={<EmailIcon />}
            />
            <Social
              href="https://www.youtube.com/channel/UCGRu7ac5g1M5fuVYPYX8Ifg"
              labelKey="a11y.youtube"
              icon={<YoutubeIcon />}
            />
            <Social
              href="https://www.linkedin.com/company/30092847/"
              labelKey="a11y.linkedin"
              icon={<LinkedInIcon />}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-14">
          <div className="flex flex-col gap-2.5">
            <h4 className="font-display text-brand-green text-[0.8rem] font-bold tracking-[0.1em] uppercase">
              {t('footer.columns.event')}
            </h4>
            <a
              href="#about"
              className="text-brand-text-dim hover:text-foreground text-[0.85rem] transition-colors"
            >
              {t('footer.links.about')}
            </a>
            <a
              href="#hardware"
              className="text-brand-text-dim hover:text-foreground text-[0.85rem] transition-colors"
            >
              {t('footer.links.hardware')}
            </a>
            <a
              href="#program"
              className="text-brand-text-dim hover:text-foreground text-[0.85rem] transition-colors"
            >
              {t('footer.links.agenda')}
            </a>
            <a
              href="#sponsor"
              className="text-brand-text-dim hover:text-foreground text-[0.85rem] transition-colors"
            >
              {t('footer.links.sponsor')}
            </a>
            <Link
              to="/register"
              className="text-brand-text-dim hover:text-foreground text-[0.85rem] transition-colors"
            >
              {t('footer.links.register')}
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            <h4 className="font-display text-brand-green text-[0.8rem] font-bold tracking-[0.1em] uppercase">
              {t('footer.columns.contact')}
            </h4>
            <a
              href={`mailto:${t('footer.links.email')}`}
              className="text-brand-text-dim hover:text-foreground text-[0.85rem] transition-colors"
            >
              {t('footer.links.email')}
            </a>
            <a
              href="https://www.itba.edu.ar/"
              className="text-brand-text-dim hover:text-foreground text-[0.85rem] transition-colors"
            >
              {t('footer.links.place')}
            </a>
          </div>
        </div>
      </div>
      <div className="text-brand-text-dim text-[0.76rem]">
        <span>{t('footer.copyright')}</span>
      </div>
    </footer>
  )
}
