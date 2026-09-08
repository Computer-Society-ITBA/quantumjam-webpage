import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BackLink } from '@/components/registration/BackLink'
import { Footer } from '@/components/landing/Footer'
import { QuantumField } from '@/components/landing/QuantumField'
import { Button } from '@/components/ui/button'
import { errorCode, submitSponsorInquiry } from '@/lib/registrationApi'

type FormState = {
  name: string
  organization: string
  email: string
  message: string
}

const emptyForm: FormState = {
  name: '',
  organization: '',
  email: '',
  message: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldKey = keyof FormState

export default function SponsorInquiryPage() {
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set =
    <K extends FieldKey>(key: K) =>
    (value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      setErrors((errs) => {
        if (!errs[key]) return errs
        const next = { ...errs }
        delete next[key]
        return next
      })
    }

  const validate = () => {
    const required = t('sponsorInquiry.validation.required')
    const next: Partial<Record<FieldKey, string>> = {}
    if (!form.name.trim()) next.name = required
    if (!form.organization.trim()) next.organization = required
    if (!form.email.trim()) next.email = required
    else if (!EMAIL_RE.test(form.email))
      next.email = t('sponsorInquiry.validation.email')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!validate()) return

    setFormError('')
    setBusy(true)
    try {
      await submitSponsorInquiry({
        name: form.name.trim(),
        organization: form.organization.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        lang: i18n.language,
      })
      setSubmitted(true)
    } catch (err) {
      const code = errorCode(err)
      if (code === 'invalid-argument') {
        setFormError(t('sponsorInquiry.validation.submitFailed'))
      } else {
        setFormError(t('sponsorInquiry.validation.submitFailed'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <BackLink to="/" label={t('sponsorInquiry.backHome')} />
      <main className="relative z-10 flex min-h-screen flex-col justify-center px-[clamp(40px,6vw,80px)] pt-20 pb-16">
        <div className="mx-auto w-full max-w-[560px]">
          <h1
            className="font-display text-foreground mb-[0.9rem] text-[clamp(1.6rem,3.4vw,2.3rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
            style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
          >
            {t('sponsorInquiry.title')}
          </h1>
          <p className="text-brand-text-dim mb-9 max-w-[58ch] font-light">
            {t('sponsorInquiry.description')}
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
              <h2 className="mb-2 text-[1.15rem] font-semibold">
                {t('sponsorInquiry.success.title')}
              </h2>
              <p className="text-brand-text-dim mx-auto max-w-[58ch]">
                {t('sponsorInquiry.success.desc')}
              </p>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-3.5"
            >
              <QuantumField
                label={t('sponsorInquiry.fields.name.label')}
                ghost1={t('sponsorInquiry.fields.name.ghost1')}
                ghost2={t('sponsorInquiry.fields.name.ghost2')}
                value={form.name}
                onChange={set('name')}
                required
                autoComplete="name"
                error={errors.name}
              />
              <QuantumField
                label={t('sponsorInquiry.fields.organization.label')}
                ghost1={t('sponsorInquiry.fields.organization.ghost1')}
                ghost2={t('sponsorInquiry.fields.organization.ghost2')}
                value={form.organization}
                onChange={set('organization')}
                required
                autoComplete="organization"
                error={errors.organization}
              />
              <QuantumField
                variant="email"
                label={t('sponsorInquiry.fields.email.label')}
                ghost1={t('sponsorInquiry.fields.email.ghost1')}
                ghost2={t('sponsorInquiry.fields.email.ghost2')}
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
                error={errors.email}
              />
              <QuantumField
                variant="textarea"
                label={t('sponsorInquiry.fields.message.label')}
                ghost1={t('sponsorInquiry.fields.message.ghost1')}
                ghost2={t('sponsorInquiry.fields.message.ghost2')}
                value={form.message}
                onChange={set('message')}
                error={errors.message}
              />

              {formError && (
                <p
                  role="alert"
                  className="text-brand-magenta-bright text-[0.85rem]"
                >
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                variant="hero"
                size="cta"
                disabled={busy}
                className="mt-2 self-start"
              >
                {busy
                  ? t('sponsorInquiry.sending')
                  : t('sponsorInquiry.submit')}
              </Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
