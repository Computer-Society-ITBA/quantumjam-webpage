import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { QuantumField } from '@/components/landing/QuantumField'
import { cn } from '@/lib/utils'

type CatState = 'indeterminate' | 'collapsing' | 'alive'

function SchrodingerBox({ state }: { state: CatState }) {
  const { t } = useTranslation()
  const mark =
    state === 'indeterminate' ? '?' : state === 'collapsing' ? '~' : '✓'
  const stateColor =
    state === 'alive' ? 'var(--brand-gold-bright)' : 'var(--brand-gold-bright)'
  const stateLabel = t(`registration.cat.${state}`)

  return (
    <div className="border-brand-line bg-brand-panel text-brand-text-dim mx-auto w-full max-w-[270px] rounded-lg border p-6 text-[0.8rem]">
      <svg
        viewBox="0 0 200 160"
        fill="none"
        aria-hidden="true"
        className="mb-3 block h-auto w-full"
      >
        <rect
          x="30"
          y="50"
          width="140"
          height="90"
          rx="6"
          stroke="var(--brand-text-dim)"
          strokeWidth="1.5"
        />
        <path
          d="M30 50 L100 20 L170 50"
          stroke="var(--brand-warm)"
          strokeWidth="1.5"
          fill="none"
          style={{
            transform:
              state === 'alive' ? 'translate(0,-14px) rotate(-8deg)' : 'none',
            transformOrigin: '100px 35px',
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <text
          x="100"
          y="102"
          textAnchor="middle"
          fontFamily="IBM Plex Sans"
          fontSize="30"
          fill="var(--brand-text-dim)"
        >
          {mark}
        </text>
      </svg>
      <p className="text-center">
        {t('registration.cat.title')}
        <br />
        {t('registration.cat.state_label')}{' '}
        <span style={{ color: stateColor }}>{stateLabel}</span>
      </p>
    </div>
  )
}

type FormState = {
  name: string
  email: string
  career: string
  level: string
  reason: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  career: '',
  level: '',
  reason: '',
}

export function Registration() {
  const { t } = useTranslation()
  const selectId = useId()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const catState: CatState = submitted
    ? 'alive'
    : submitting
      ? 'collapsing'
      : 'indeterminate'

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (submitting || submitted) return
    setSubmitting(true)
    window.setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 1300)
  }

  return (
    <section
      id="inscripcion"
      className="relative z-10 px-[clamp(20px,6vw,80px)] py-[clamp(56px,9vw,120px)]"
    >
      <h2 className="text-foreground mb-[0.9rem] text-[clamp(1.5rem,3vw,2.15rem)] font-semibold tracking-tight">
        {t('registration.title')}
      </h2>
      <p className="text-brand-text-dim mb-9 max-w-[58ch]">
        {t('registration.description')}
      </p>

      <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-[1fr_1.15fr]">
        <SchrodingerBox state={catState} />

        <div>
          {submitted ? (
            <div className="border-brand-line bg-brand-panel rounded-lg border p-8 text-center">
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
                  stroke="var(--brand-gold-bright)"
                  strokeWidth="2"
                />
                <path
                  d="M20 33 L28 41 L45 22"
                  stroke="var(--brand-gold-bright)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <h3 className="mb-2 text-[1.15rem] font-semibold">
                {t('registration.success.title')}
              </h3>
              <p className="text-brand-text-dim mx-auto max-w-[58ch]">
                {t('registration.success.desc')}
              </p>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-3.5"
              noValidate={false}
            >
              <QuantumField
                label={t('registration.fields.name.label')}
                ghost1={t('registration.fields.name.ghost1')}
                ghost2={t('registration.fields.name.ghost2')}
                value={form.name}
                onChange={set('name')}
                required
              />
              <QuantumField
                variant="email"
                label={t('registration.fields.email.label')}
                ghost1={t('registration.fields.email.ghost1')}
                ghost2={t('registration.fields.email.ghost2')}
                value={form.email}
                onChange={set('email')}
                required
              />
              <QuantumField
                label={t('registration.fields.career.label')}
                ghost1={t('registration.fields.career.ghost1')}
                ghost2={t('registration.fields.career.ghost2')}
                value={form.career}
                onChange={set('career')}
                required
              />

              <div>
                <label
                  htmlFor={selectId}
                  className="text-brand-text-dim mb-1.5 block text-[0.72rem] font-medium tracking-[0.05em] uppercase"
                >
                  {t('registration.fields.level.label')}
                </label>
                <div className="bg-brand-panel border-brand-line focus-within:border-brand-warm relative h-[58px] overflow-hidden rounded-md border transition-[border-color,box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_rgba(201,151,79,0.16)]">
                  <select
                    id={selectId}
                    className="text-foreground relative z-[2] h-full w-full appearance-none border-none bg-transparent px-3.5 text-[0.92rem] focus:outline-none"
                    value={form.level}
                    onChange={(e) => set('level')(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      {t('registration.fields.level.placeholder')}
                    </option>
                    <option value="none">
                      {t('registration.fields.level.options.none')}
                    </option>
                    <option value="basic">
                      {t('registration.fields.level.options.basic')}
                    </option>
                    <option value="intermediate">
                      {t('registration.fields.level.options.intermediate')}
                    </option>
                  </select>
                </div>
              </div>

              <QuantumField
                variant="textarea"
                label={t('registration.fields.reason.label')}
                ghost1={t('registration.fields.reason.ghost1')}
                ghost2={t('registration.fields.reason.ghost2')}
                value={form.reason}
                onChange={set('reason')}
              />

              <Button
                type="submit"
                variant="hero"
                size="cta"
                disabled={submitting}
                className={cn(
                  'mt-1 justify-center',
                  submitting && 'cursor-progress opacity-70',
                )}
              >
                {submitting
                  ? t('registration.submitting')
                  : t('registration.submit')}
              </Button>
              <p className="text-brand-text-dim mt-0.5 text-[0.76rem]">
                {t('registration.note')}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
