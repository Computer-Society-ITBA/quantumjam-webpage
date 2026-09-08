import { useTranslation } from 'react-i18next'

import { DISCORD_INVITE_URL } from '@/lib/links'

const STEPS = ['join', 'rules', 'intro', 'sessions'] as const

/**
 * Post-signup Discord onboarding for the workshops: the invite plus what
 * to do once inside. Shown on the confirmation screen and mirrored by the
 * confirmation email, so someone who closes the tab still has it.
 */
export function DiscordNextSteps() {
  const { t } = useTranslation()

  return (
    <div className="border-brand-line mt-7 border-t pt-7 text-left">
      <p className="text-brand-text-dim mb-4 text-center text-[0.9rem]">
        {t('registration.workshops.success.discord.intro')}
      </p>

      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noreferrer"
        className="border-brand-green text-brand-green hover:bg-brand-green font-display mb-7 flex h-12 w-full items-center justify-center border-2 text-[0.8rem] font-bold tracking-[0.12em] uppercase transition-colors duration-300 hover:text-[#0c1400]"
      >
        {t('registration.workshops.success.discord.cta')}
      </a>

      <p className="font-display text-brand-text-dim mb-3 text-[0.76rem] font-bold tracking-[0.06em] uppercase">
        {t('registration.workshops.success.discord.stepsTitle')}
      </p>
      <ol className="text-brand-text-dim flex flex-col gap-2.5 text-[0.88rem] font-light">
        {STEPS.map((id, i) => (
          <li key={id} className="flex gap-3">
            <span className="font-display text-brand-green flex-shrink-0 text-[0.8rem] font-bold">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>
              {t(`registration.workshops.success.discord.steps.${id}`)}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-brand-text-dim/70 mt-6 text-[0.76rem] break-all">
        {t('registration.workshops.success.discord.fallback', {
          url: DISCORD_INVITE_URL,
        })}
      </p>
    </div>
  )
}
