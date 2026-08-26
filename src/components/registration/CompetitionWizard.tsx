import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { QuantumField } from '@/components/landing/QuantumField'
import { StepRail, type StepRailItem } from '@/components/registration/StepRail'
import { VerifyCodeInput } from '@/components/registration/VerifyCodeInput'
import { TeamStep } from '@/components/registration/TeamStep'
import { useResendCooldown } from '@/components/registration/useResendCooldown'
import {
  MAX_TEAM_SIZE,
  canLeaveTeamStep,
  emptyCode,
  emptyTeam,
  isCodeComplete,
  teamIdFrom,
  type TeamLookup,
  type TeamState,
} from '@/components/registration/wizard'
import {
  confirmCode,
  errorCode,
  lookupTeam,
  requestCode,
  submitCompetition,
  type TeamChoicePayload,
} from '@/lib/registrationApi'
import { cn } from '@/lib/utils'

const STEPS = ['email', 'verify', 'personal', 'socials', 'team'] as const

type StepId = (typeof STEPS)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// DNI or passport, per the field's own copy — passports can contain letters.
const ID_RE = /^[a-zA-Z0-9]{5,20}$/
const AGE_RE = /^\d{1,3}$/
const GRAD_YEAR_RE = /^\d{4}$/
const REQUIRED_PERSONAL_FIELDS = [
  'dni',
  'age',
  'university',
  'location',
] as const

type Details = {
  email: string
  dni: string
  age: string
  university: string
  major: string
  gradYear: string
  location: string
  diet: string
  github: string
  linkedin: string
  x: string
  instagram: string
  website: string
}

const emptyDetails: Details = {
  email: '',
  dni: '',
  age: '',
  university: '',
  major: '',
  gradYear: '',
  location: '',
  diet: '',
  github: '',
  linkedin: '',
  x: '',
  instagram: '',
  website: '',
}

type FieldErrors = Partial<Record<keyof Details, string>>

function teamPayload(team: TeamState): TeamChoicePayload {
  if (team.choice === 'create') return { choice: 'create', name: team.name }
  if (team.choice === 'join') return { choice: 'join', code: team.code }
  return { choice: 'alone' }
}

export function CompetitionWizard() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<Details>(emptyDetails)
  const [team, setTeam] = useState<TeamState>(emptyTeam)
  const [code, setCode] = useState(emptyCode)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [codeError, setCodeError] = useState('')
  const [teamError, setTeamError] = useState('')
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  )
  const [teamLookup, setTeamLookup] = useState<TeamLookup | null>(null)
  const [teamLookupLoading, setTeamLookupLoading] = useState(false)

  const current: StepId = STEPS[step]
  const { cooldown, reset: resetCooldown } = useResendCooldown(
    current === 'verify',
  )

  useEffect(() => {
    if (team.choice !== 'join') {
      setTeamLookup(null)
      setTeamLookupLoading(false)
      return
    }
    const slug = teamIdFrom(team.code)
    if (slug.length < 4) {
      setTeamLookup(null)
      setTeamLookupLoading(false)
      return
    }
    setTeamLookupLoading(true)
    const handle = window.setTimeout(() => {
      lookupTeam(slug)
        .then((result) => setTeamLookup(result))
        .catch(() => setTeamLookup(null))
        .finally(() => setTeamLookupLoading(false))
    }, 400)
    return () => window.clearTimeout(handle)
  }, [team.choice, team.code])

  const set =
    <K extends keyof Details>(key: K) =>
    (value: Details[K]) => {
      setDetails((d) => ({ ...d, [key]: value }))
      setFieldErrors((errs) => {
        if (!errs[key]) return errs
        const next = { ...errs }
        delete next[key]
        return next
      })
    }

  const setEmail = (value: string) => {
    set('email')(value)
    setVerificationToken(null)
  }

  const field = (key: keyof Details, required = false) => ({
    label: t(`registration.fields.${key}.label`),
    ghost1: t(`registration.fields.${key}.ghost1`),
    ghost2: t(`registration.fields.${key}.ghost2`),
    value: details[key],
    onChange: set(key),
    required,
    error: fieldErrors[key],
  })

  const validateCurrentStep = (): boolean => {
    const required = t('registration.validation.required')
    if (current === 'email') {
      if (!details.email.trim()) {
        setFieldErrors({ email: required })
        return false
      }
      if (!EMAIL_RE.test(details.email)) {
        setFieldErrors({ email: t('registration.validation.email') })
        return false
      }
      setFieldErrors({})
      return true
    }
    if (current === 'verify') {
      if (!isCodeComplete(code)) {
        setCodeError(t('registration.validation.code'))
        return false
      }
      setCodeError('')
      return true
    }
    if (current === 'personal') {
      const next: FieldErrors = {}
      for (const key of REQUIRED_PERSONAL_FIELDS) {
        if (!details[key].trim()) next[key] = required
      }
      if (!next.dni && !ID_RE.test(details.dni.trim())) {
        next.dni = t('registration.validation.invalidId')
      }
      if (!next.age && !AGE_RE.test(details.age.trim())) {
        next.age = t('registration.validation.numeric')
      }
      if (
        details.gradYear.trim() &&
        !GRAD_YEAR_RE.test(details.gradYear.trim())
      ) {
        next.gradYear = t('registration.validation.year')
      }
      setFieldErrors(next)
      return Object.keys(next).length === 0
    }
    if (current === 'team') {
      if (!canLeaveTeamStep(team, teamLookup)) {
        setTeamError(t('registration.validation.team'))
        return false
      }
      setTeamError('')
      return true
    }
    return true
  }

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0))
  }

  const requestVerification = async () => {
    setBusy(true)
    try {
      await requestCode(details.email, 'competition')
      resetCooldown()
      return true
    } catch (err) {
      const code = errorCode(err)
      setFieldErrors({
        email:
          code === 'already-exists'
            ? t('registration.validation.emailTaken')
            : t('registration.validation.submitFailed'),
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    if (!validateCurrentStep()) return

    if (current === 'email') {
      if (await requestVerification()) setStep(step + 1)
      return
    }

    if (current === 'verify') {
      setBusy(true)
      try {
        const result = await confirmCode(details.email, 'competition', code)
        setVerificationToken(result.verificationToken)
        setStep(step + 1)
      } catch (err) {
        const errCode = errorCode(err)
        if (errCode === 'deadline-exceeded' || errCode === 'not-found') {
          setCodeError(t('registration.validation.codeExpired'))
        } else if (errCode === 'resource-exhausted') {
          setCodeError(t('registration.validation.tooManyAttempts'))
        } else {
          setCodeError(t('registration.validation.codeInvalid'))
        }
      } finally {
        setBusy(false)
      }
      return
    }

    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }

    if (!verificationToken) {
      setTeamError(t('registration.validation.submitFailed'))
      return
    }
    setBusy(true)
    try {
      await submitCompetition({
        email: details.email,
        verificationToken,
        dni: details.dni.trim(),
        age: details.age.trim(),
        university: details.university,
        major: details.major,
        gradYear: details.gradYear.trim(),
        location: details.location,
        diet: details.diet,
        github: details.github,
        linkedin: details.linkedin,
        x: details.x,
        instagram: details.instagram,
        website: details.website,
        team: teamPayload(team),
      })
      setSubmitted(true)
    } catch (err) {
      const errCode = errorCode(err)
      if (errCode === 'already-exists') {
        setTeamError(t('registration.validation.teamCodeTaken'))
      } else if (errCode === 'not-found') {
        setTeamError(t('registration.validation.teamNotFound'))
      } else if (errCode === 'resource-exhausted') {
        setTeamError(
          t('registration.wizard.team.join.full', { max: MAX_TEAM_SIZE }),
        )
      } else if (errCode === 'failed-precondition') {
        setTeamError(t('registration.validation.codeExpired'))
      } else {
        setTeamError(t('registration.validation.submitFailed'))
      }
    } finally {
      setBusy(false)
    }
  }

  const railSteps: StepRailItem[] = STEPS.map((id) => ({
    id,
    label: t(`registration.wizard.steps.${id}`),
  }))

  if (submitted) {
    return (
      <section className="relative z-10 px-[clamp(20px,6vw,80px)] pt-20 pb-16">
        <div className="border-brand-line bg-brand-panel mx-auto max-w-[560px] border p-8 text-center">
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
            {t('registration.competition.success.title')}
          </h3>
          <p className="text-brand-text-dim mx-auto max-w-[58ch]">
            {t('registration.competition.success.desc')}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative z-10 px-[clamp(20px,6vw,80px)] pt-20 pb-16">
      <div className="mx-auto max-w-[560px]">
        <h2
          className="font-display text-foreground mb-[0.9rem] text-[clamp(1.5rem,3vw,2.15rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
          style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
        >
          {t('registration.competition.title')}
        </h2>
        <p className="text-brand-text-dim mb-9 max-w-[58ch] font-light">
          {t('registration.competition.description')}
        </p>

        <StepRail steps={railSteps} current={step} />

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
          <div className="mb-2 flex items-center justify-between gap-4">
            <h3 className="text-foreground text-[1.1rem] font-semibold">
              {t(`registration.wizard.${current}.title`)}
            </h3>
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
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

          {current === 'email' && (
            <QuantumField
              variant="email"
              {...field('email', true)}
              onChange={setEmail}
            />
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
                      await requestCode(details.email, 'competition')
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
                    setVerificationToken(null)
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

          {current === 'personal' && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <QuantumField {...field('dni', true)} />
              <QuantumField {...field('age', true)} />
              <div className="sm:col-span-2">
                <QuantumField {...field('university', true)} />
              </div>
              <QuantumField {...field('major', true)} />
              <QuantumField {...field('gradYear', true)} />
              <div className="sm:col-span-2">
                <QuantumField {...field('location', true)} />
              </div>
              <div className="sm:col-span-2">
                <QuantumField variant="textarea" {...field('diet')} />
              </div>
            </div>
          )}

          {current === 'socials' && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <QuantumField {...field('github')} />
              <QuantumField {...field('linkedin')} />
              <QuantumField {...field('x')} />
              <QuantumField {...field('instagram')} />
              <div className="sm:col-span-2">
                <QuantumField {...field('website')} />
              </div>
            </div>
          )}

          {current === 'team' && (
            <TeamStep
              value={team}
              onChange={(next) => {
                setTeam(next)
                if (teamError) setTeamError('')
              }}
              error={teamError}
              lookup={teamLookup}
              lookupLoading={teamLookupLoading}
            />
          )}

          <div className="mt-3 flex flex-col items-center gap-3.5 text-center">
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
              {busy && current === 'team'
                ? t('registration.competition.submitting')
                : t(`registration.wizard.${current}.submit`)}
            </Button>
            <p className="text-brand-text-dim max-w-[46ch] text-[0.76rem]">
              {t('registration.consent')}
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
