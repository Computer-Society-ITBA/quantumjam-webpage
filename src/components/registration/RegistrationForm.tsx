import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { QuantumField } from '@/components/landing/QuantumField'
import { CustomSelect } from '@/components/registration/CustomSelect'
import { StepRail, type StepRailItem } from '@/components/registration/StepRail'
import { VerifyCodeInput } from '@/components/registration/VerifyCodeInput'
import { useResendCooldown } from '@/components/registration/useResendCooldown'
import { emptyCode, isCodeComplete } from '@/components/registration/wizard'
import {
  confirmCode,
  errorCode,
  requestCode,
  submitWorkshop,
} from '@/lib/registrationApi'
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
const STEPS = ['details', 'verify'] as const
type StepId = (typeof STEPS)[number]

type RegistrationFormProps = {
  event: 'workshops' | 'competition'
  showTeamField?: boolean
}

export function RegistrationForm({
  event,
  showTeamField = false,
}: RegistrationFormProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({})
  const [code, setCode] = useState(emptyCode)
  const [codeError, setCodeError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const current: StepId = STEPS[step]
  const { cooldown, reset: resetCooldown } = useResendCooldown(
    current === 'verify',
  )

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

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy || submitted) return

    if (current === 'details') {
      const nextErrors = validate()
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors)
        return
      }
      setErrors({})
      setBusy(true)
      try {
        await requestCode(form.email, 'workshops')
        resetCooldown()
        setStep(1)
      } catch (err) {
        const errCode = errorCode(err)
        setErrors({
          email:
            errCode === 'already-exists'
              ? t('registration.validation.emailTaken')
              : t('registration.validation.submitFailed'),
        })
      } finally {
        setBusy(false)
      }
      return
    }

    if (!isCodeComplete(code)) {
      setCodeError(t('registration.validation.code'))
      return
    }
    setCodeError('')
    setBusy(true)
    try {
      const { verificationToken } = await confirmCode(
        form.email,
        'workshops',
        code,
      )
      await submitWorkshop({
        email: form.email,
        verificationToken,
        name: form.name,
        career: form.career,
        level: form.level,
        reason: form.reason,
      })
      setSubmitted(true)
    } catch (err) {
      const errCode = errorCode(err)
      if (errCode === 'deadline-exceeded' || errCode === 'not-found') {
        setCodeError(t('registration.validation.codeExpired'))
      } else if (errCode === 'resource-exhausted') {
        setCodeError(t('registration.validation.tooManyAttempts'))
      } else if (errCode === 'already-exists') {
        setCodeError(t('registration.validation.emailTaken'))
      } else if (errCode === 'invalid-argument') {
        setCodeError(t('registration.validation.codeInvalid'))
      } else {
        setCodeError(t('registration.validation.submitFailed'))
      }
    } finally {
      setBusy(false)
    }
  }

  const railSteps: StepRailItem[] = STEPS.map((id) => ({
    id,
    label: t(`registration.wizard.steps.${id}`),
  }))

  return (
    <section className="relative z-10 px-[clamp(40px,6vw,80px)] pt-20 pb-16">
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
          <>
            <StepRail steps={railSteps} current={step} />
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-3.5"
            >
              <div className="mb-2 flex items-center justify-between gap-4">
                <h3 className="text-foreground text-[1.1rem] font-semibold">
                  {current === 'details'
                    ? t('registration.wizard.steps.details')
                    : t('registration.wizard.verify.title')}
                </h3>
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCode(emptyCode)
                      setCodeError('')
                      setStep(0)
                    }}
                    className="text-brand-text-dim hover:text-brand-green flex flex-shrink-0 items-center gap-2 text-[0.85rem] leading-none transition-colors"
                  >
                    <span
                      aria-hidden="true"
                      className="text-[1.05rem] leading-none"
                    >
                      ⟨
                    </span>
                    <span className="leading-none">
                      {t('registration.wizard.back')}
                    </span>
                  </button>
                )}
              </div>

              {current === 'details' && (
                <>
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
                        label: t(
                          'registration.fields.level.options.intermediate',
                        ),
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
                </>
              )}

              {current === 'verify' && (
                <div className="flex flex-col gap-4">
                  <VerifyCodeInput
                    value={code}
                    onChange={(value) => {
                      setCode(value)
                      if (codeError) setCodeError('')
                    }}
                    label={t('registration.wizard.verify.codeLabel')}
                    error={codeError}
                  />
                  <div className="text-brand-text-dim flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.82rem]">
                    <button
                      type="button"
                      disabled={cooldown > 0 || busy}
                      onClick={async () => {
                        setBusy(true)
                        try {
                          await requestCode(form.email, 'workshops')
                          resetCooldown()
                          setCode(emptyCode)
                          setCodeError('')
                        } catch (err) {
                          const errCode = errorCode(err)
                          setCodeError(
                            errCode === 'resource-exhausted'
                              ? t('registration.validation.tooManyAttempts')
                              : t('registration.validation.submitFailed'),
                          )
                        } finally {
                          setBusy(false)
                        }
                      }}
                      className="text-brand-magenta-bright hover:text-brand-green transition-colors disabled:cursor-not-allowed disabled:text-current disabled:opacity-70"
                    >
                      {cooldown > 0
                        ? t('registration.wizard.verify.resendIn', {
                            seconds: cooldown,
                          })
                        : t('registration.wizard.verify.resend')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCode(emptyCode)
                        setCodeError('')
                        setStep(0)
                      }}
                      className="hover:text-brand-green transition-colors"
                    >
                      {t('registration.wizard.verify.changeEmail')}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-1 flex flex-col items-center gap-3.5 text-center">
                <Button
                  type="submit"
                  variant="hero"
                  size="cta"
                  disabled={busy}
                  className={cn(
                    'w-full justify-center',
                    busy && 'cursor-progress opacity-70',
                  )}
                >
                  {busy && current === 'verify'
                    ? t(`registration.${event}.submitting`)
                    : current === 'details'
                      ? t('registration.wizard.email.submit')
                      : t('registration.wizard.verify.submit')}
                </Button>
                <p className="text-brand-text-dim max-w-[46ch] text-[0.76rem]">
                  {t('registration.consent')}
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
