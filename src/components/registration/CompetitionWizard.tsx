import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { QuantumField } from '@/components/landing/QuantumField'
import { SignupSummary } from '@/components/registration/SignupSummary'
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
  saveDraft,
  submitCompetition,
  type RegisteredSignup,
  type TeamChoicePayload,
} from '@/lib/registrationApi'
import { cn } from '@/lib/utils'

const STEPS = ['email', 'verify', 'personal', 'socials', 'team'] as const

type StepId = (typeof STEPS)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// DNI or passport, per the field's own copy: passports can contain letters.
const ID_RE = /^[a-zA-Z0-9]{5,20}$/
const AGE_RE = /^\d{1,3}$/
const GRAD_YEAR_RE = /^\d{4}$/
// Mirrors NAME_RE in functions/src/competition.ts.
const NAME_RE = /^(?=.*\p{L})[\p{L}\p{M}'’ .-]{1,60}$/u
const REQUIRED_PERSONAL_FIELDS = [
  'firstName',
  'lastName',
  'dni',
  'age',
  'university',
  'location',
] as const

type Details = {
  email: string
  firstName: string
  lastName: string
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
  firstName: '',
  lastName: '',
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

// Steps saved server-side as the visitor moves past them, so an unfinished
// sign-up can be resumed. Mirrors the parsers in functions/src/drafts.ts.
const DRAFT_FIELDS = {
  personal: [
    'firstName',
    'lastName',
    'dni',
    'age',
    'university',
    'major',
    'gradYear',
    'location',
    'diet',
  ],
  socials: ['github', 'linkedin', 'x', 'instagram', 'website'],
} as const satisfies Partial<Record<StepId, readonly (keyof Details)[]>>

type DraftStepId = keyof typeof DRAFT_FIELDS

const isDraftStep = (id: StepId): id is DraftStepId => id in DRAFT_FIELDS

const SUMMARY_FIELDS = [
  ...DRAFT_FIELDS.personal,
  ...DRAFT_FIELDS.socials,
] as const

const AUTOSAVE_DELAY_MS = 1200

const teamDraft = (team: TeamState) => ({
  teamChoice: team.choice ?? '',
  teamName: team.name,
  teamCode: team.code,
})

function teamFromDraft(data: Record<string, string>): TeamState | null {
  const choice = data.teamChoice
  if (choice !== 'join' && choice !== 'create' && choice !== 'alone') {
    return null
  }
  return { choice, name: data.teamName ?? '', code: data.teamCode ?? '' }
}

function teamPayload(team: TeamState): TeamChoicePayload {
  if (team.choice === 'create') return { choice: 'create', name: team.name }
  if (team.choice === 'join') return { choice: 'join', code: team.code }
  return { choice: 'alone' }
}

export function CompetitionWizard() {
  const { t, i18n } = useTranslation()
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
  const [resumed, setResumed] = useState(false)
  const [existing, setExisting] = useState<RegisteredSignup | null>(null)
  // Where to land after re-verifying when the verification lapsed mid-form.
  const returnStep = useRef<number | null>(null)
  const lastSavedTeam = useRef(JSON.stringify(teamDraft(emptyTeam)))

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

  // The team step is the last one, so there is no "continue" to save it
  // on: it is saved as it is chosen. Nothing is reserved until the submit.
  const { email } = details
  useEffect(() => {
    if (current !== 'team' || !verificationToken || submitted) return
    const data = {
      teamChoice: team.choice ?? '',
      teamName: team.name,
      teamCode: team.code,
    }
    const snapshot = JSON.stringify(data)
    if (snapshot === lastSavedTeam.current) return
    const handle = window.setTimeout(() => {
      lastSavedTeam.current = snapshot
      // Best-effort: the submit carries the team choice regardless.
      saveDraft({
        email,
        purpose: 'competition',
        verificationToken,
        step: 'team',
        data,
      }).catch(() => {
        lastSavedTeam.current = ''
      })
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(handle)
  }, [
    current,
    verificationToken,
    submitted,
    email,
    team.choice,
    team.name,
    team.code,
  ])

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
    returnStep.current = null
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
      for (const key of ['firstName', 'lastName'] as const) {
        if (!next[key] && !NAME_RE.test(details[key].trim())) {
          next[key] = t('registration.validation.invalidName')
        }
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

  /** The verification lapsed: confirm a fresh code, then come back here. */
  const reverify = () => {
    returnStep.current = step
    setVerificationToken(null)
    setCode(emptyCode)
    setCodeError('')
    setFieldErrors({ email: t('registration.validation.codeExpired') })
    setStep(0)
  }

  /**
   * Saves the step being left. Returns false only when the visitor can't
   * move on; a plain network failure doesn't hold them back, since the
   * final submit carries every field anyway.
   */
  const saveStep = async (id: DraftStepId): Promise<boolean> => {
    if (!verificationToken) {
      reverify()
      return false
    }
    setBusy(true)
    try {
      await saveDraft({
        email: details.email,
        purpose: 'competition',
        verificationToken,
        step: id,
        data: Object.fromEntries(
          DRAFT_FIELDS[id].map((key) => [key, details[key]]),
        ),
      })
    } catch (err) {
      if (errorCode(err) === 'failed-precondition') {
        reverify()
        return false
      }
    } finally {
      setBusy(false)
    }
    return true
  }

  const requestVerification = async () => {
    setBusy(true)
    try {
      await requestCode(details.email, 'competition', i18n.language)
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
        if (result.signup) {
          setExisting(result.signup)
          return
        }
        setVerificationToken(result.verificationToken)
        const draft = result.draft
        let personalComplete = true
        if (draft) {
          // Anything already typed in this session is newer than the save.
          const typed = Object.fromEntries(
            Object.entries(details).filter(([, value]) => value.trim()),
          )
          const saved = Object.fromEntries(
            Object.entries(draft.data).filter(([key]) => key in emptyDetails),
          )
          const restored = { ...emptyDetails, ...saved, ...typed }
          setDetails(restored)
          // A draft saved before a field became required is not past the
          // personal step after all.
          personalComplete = REQUIRED_PERSONAL_FIELDS.every((key) =>
            restored[key].trim(),
          )
          const savedTeam = teamFromDraft(draft.data)
          if (savedTeam && team.choice === null) {
            setTeam(savedTeam)
            lastSavedTeam.current = JSON.stringify(teamDraft(savedTeam))
          }
        }
        if (returnStep.current !== null) {
          setStep(returnStep.current)
          returnStep.current = null
        } else if (draft) {
          setResumed(true)
          const done = draft.lastCompletedStep as StepId | null
          setStep(done && personalComplete ? STEPS.indexOf(done) + 1 : step + 1)
        } else {
          setStep(step + 1)
        }
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

    if (isDraftStep(current)) {
      if (await saveStep(current)) setStep(step + 1)
      return
    }

    if (!verificationToken) {
      reverify()
      return
    }
    setBusy(true)
    try {
      await submitCompetition({
        email: details.email,
        verificationToken,
        firstName: details.firstName.trim(),
        lastName: details.lastName.trim(),
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
        lang: i18n.language,
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
        reverify()
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

  if (submitted || existing) {
    return (
      <section className="relative z-10 px-[clamp(40px,6vw,80px)] pt-20 pb-16">
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
            {existing
              ? t('registration.competition.registered.title')
              : t('registration.competition.success.title')}
          </h3>
          <p className="text-brand-text-dim mx-auto max-w-[58ch]">
            {existing
              ? t('registration.competition.registered.desc')
              : t('registration.competition.success.desc')}
          </p>
          {existing && (existing.teamName || existing.teamCode) && (
            <div className="border-brand-green/35 bg-brand-green/[0.05] mt-7 border p-5">
              <p className="font-display text-brand-text-dim mb-1.5 text-[0.76rem] font-bold tracking-[0.04em] uppercase">
                {t('registration.wizard.steps.team')}
              </p>
              <p className="text-foreground text-[1.5rem] leading-tight font-semibold break-words">
                {existing.teamName || existing.teamCode}
              </p>
              <p className="font-display text-brand-text-dim mt-4 mb-1.5 text-[0.76rem] font-bold tracking-[0.04em] uppercase">
                {t('registration.fields.teamCode.label')}
              </p>
              <code className="text-brand-green font-sans text-[1.3rem] tracking-[0.02em] break-all">
                {existing.teamCode}
              </code>
            </div>
          )}
          {existing && (
            <SignupSummary
              rows={[
                [t('registration.fields.email.label'), details.email.trim()],
                ...SUMMARY_FIELDS.map(
                  (key) =>
                    [
                      t(`registration.fields.${key}.label`),
                      existing[key],
                    ] as const,
                ),
                [
                  t('registration.wizard.steps.team'),
                  existing.teamChoice === 'alone'
                    ? t('registration.wizard.team.choices.alone.title')
                    : '',
                ],
              ]}
            />
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="relative z-10 px-[clamp(40px,6vw,80px)] pt-20 pb-16">
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
                      await requestCode(
                        details.email,
                        'competition',
                        i18n.language,
                      )
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
                    returnStep.current = null
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

          {resumed && current !== 'email' && current !== 'verify' && (
            <p role="status" className="text-brand-green text-[0.82rem]">
              {t('registration.wizard.resumed')}
            </p>
          )}

          {current === 'personal' && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <QuantumField {...field('firstName', true)} />
              <QuantumField {...field('lastName', true)} />
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
