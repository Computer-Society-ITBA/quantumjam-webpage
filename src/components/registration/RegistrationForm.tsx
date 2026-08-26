import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { QuantumField } from '@/components/landing/QuantumField'
import { CustomSelect } from '@/components/registration/CustomSelect'
import { cn } from '@/lib/utils'

type FormState = {
  name: string
  email: string
  career: string
  level: string
  team: string
  reason: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  career: '',
  level: '',
  team: '',
  reason: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type RegistrationFormProps = {
  event: 'workshops' | 'competition'
  showTeamField?: boolean
}

export function RegistrationForm({
  event,
  showTeamField = false,
}: RegistrationFormProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      setErrors((errs) => {
        if (!errs[key]) return errs
        const next = { ...errs }
        delete next[key]
        return next
      })
    }

  const validate = (): Partial<Record<keyof FormState, string>> => {
    const required = t('registration.validation.required')
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) next.name = required
    if (!form.email.trim()) next.email = required
    else if (!EMAIL_RE.test(form.email))
      next.email = t('registration.validation.email')
    if (!form.career.trim()) next.career = required
    if (!form.level) next.level = required
    return next
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting || submitted) return
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    setSubmitting(true)
    window.setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 1300)
  }

  return (
    <section className="relative z-10 px-[clamp(20px,6vw,80px)] pt-20 pb-16">
      <div className="mx-auto max-w-[560px]">
        <h2
          className="font-display text-foreground mb-[0.9rem] text-[clamp(1.5rem,3vw,2.15rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
          style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
        >
          {t(`registration.${event}.title`)}
        </h2>
        <p className="text-brand-text-dim mb-9 max-w-[58ch] font-light">
          {t(`registration.${event}.description`)}
        </p>

        {submitted ? (
          <div className="border-brand-line bg-brand-panel border p-8 text-center">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className="mx-auto mb-3.5 block w-14"
            >
              <circle
                cx="32"
                cy="32"
                r="30"
                stroke="var(--brand-green)"
                strokeWidth="2"
              />
              <path
                d="M20 33 L28 41 L45 22"
                stroke="var(--brand-green)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <h3 className="mb-2 text-[1.15rem] font-semibold">
              {t(`registration.${event}.success.title`)}
            </h3>
            <p className="text-brand-text-dim mx-auto max-w-[58ch]">
              {t(`registration.${event}.success.desc`)}
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className="flex flex-col gap-3.5"
          >
            <QuantumField
              label={t('registration.fields.name.label')}
              ghost1={t('registration.fields.name.ghost1')}
              ghost2={t('registration.fields.name.ghost2')}
              value={form.name}
              onChange={set('name')}
              required
              error={errors.name}
            />
            <QuantumField
              variant="email"
              label={t('registration.fields.email.label')}
              ghost1={t('registration.fields.email.ghost1')}
              ghost2={t('registration.fields.email.ghost2')}
              value={form.email}
              onChange={set('email')}
              required
              error={errors.email}
            />
            <QuantumField
              label={t('registration.fields.career.label')}
              ghost1={t('registration.fields.career.ghost1')}
              ghost2={t('registration.fields.career.ghost2')}
              value={form.career}
              onChange={set('career')}
              required
              error={errors.career}
            />

            <CustomSelect
              label={t('registration.fields.level.label')}
              placeholder={t('registration.fields.level.placeholder')}
              value={form.level}
              onChange={set('level')}
              required
              error={errors.level}
              options={[
                {
                  value: 'none',
                  label: t('registration.fields.level.options.none'),
                },
                {
                  value: 'basic',
                  label: t('registration.fields.level.options.basic'),
                },
                {
                  value: 'intermediate',
                  label: t('registration.fields.level.options.intermediate'),
                },
              ]}
            />

            {showTeamField && (
              <QuantumField
                label={t('registration.fields.team.label')}
                ghost1={t('registration.fields.team.ghost1')}
                ghost2={t('registration.fields.team.ghost2')}
                value={form.team}
                onChange={set('team')}
              />
            )}

            <QuantumField
              variant="textarea"
              label={t('registration.fields.reason.label')}
              ghost1={t('registration.fields.reason.ghost1')}
              ghost2={t('registration.fields.reason.ghost2')}
              value={form.reason}
              onChange={set('reason')}
            />

            <div className="mt-1 flex flex-col items-center gap-3.5 text-center">
              <Button
                type="submit"
                variant="hero"
                size="cta"
                disabled={submitting}
                className={cn(
                  'w-full justify-center',
                  submitting && 'cursor-progress opacity-70',
                )}
              >
                {submitting
                  ? t(`registration.${event}.submitting`)
                  : t(`registration.${event}.submit`)}
              </Button>
              <p className="text-brand-text-dim text-[0.76rem]">
                {t(`registration.${event}.note`)}
              </p>
              <p className="text-brand-text-dim max-w-[46ch] text-[0.76rem]">
                {t('registration.consent')}
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
