import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { INPUT_CLASSES } from '@/components/admin/inputClasses'
import { FieldLabel } from '@/components/landing/QuantumField'
import { VerifyCodeInput } from '@/components/registration/VerifyCodeInput'
import { useResendCooldown } from '@/components/registration/useResendCooldown'
import { Button } from '@/components/ui/button'
import {
  jamConfirmCode,
  jamErrorCode,
  jamRequestCode,
  saveSession,
  type JamSession,
} from '@/lib/jamApi'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function JamAuth({
  onAuthed,
}: {
  onAuthed: (session: JamSession) => void
}) {
  const { t, i18n } = useTranslation()
  const baseId = useId()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { cooldown, reset: resetCooldown } = useResendCooldown(step === 'code')

  const emailOk = EMAIL_RE.test(email.trim())

  const messageFor = (err: unknown) => {
    const c = jamErrorCode(err)
    if (c === 'permission-denied') return t('jam.auth.errors.notRegistered')
    if (c === 'resource-exhausted') return t('jam.auth.errors.tooMany')
    if (c === 'deadline-exceeded') return t('jam.auth.errors.expired')
    if (c === 'invalid-argument') return t('jam.auth.errors.badCode')
    if (c === 'not-found') return t('jam.auth.errors.noCode')
    if (c === 'failed-precondition') return t('jam.auth.errors.closed')
    return t('jam.auth.errors.generic')
  }

  const requestCode = async () => {
    if (busy || !emailOk) return
    setBusy(true)
    setError('')
    try {
      await jamRequestCode(email.trim(), i18n.language)
      setStep('code')
      resetCooldown()
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (busy || !/^\d{6}$/.test(code)) return
    setBusy(true)
    setError('')
    try {
      const data = await jamConfirmCode(email.trim(), code)
      const session: JamSession = {
        playerId: data.playerId,
        sessionToken: data.sessionToken,
        displayName: data.displayName,
      }
      saveSession(session)
      onAuthed(session)
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full text-left">
      {step === 'email' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void requestCode()
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <FieldLabel
              htmlFor={`${baseId}-email`}
              label={t('jam.auth.emailLabel')}
            />
            <input
              id={`${baseId}-email`}
              type="email"
              className={INPUT_CLASSES}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t('jam.auth.emailPlaceholder')}
            />
          </div>
          {error && (
            <p
              role="alert"
              className="text-brand-magenta-bright text-[0.85rem]"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="hero"
            size="cta"
            disabled={busy || !emailOk}
            className="w-full"
          >
            {busy ? t('jam.auth.sending') : t('jam.auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void confirm()
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-brand-text-dim text-[0.88rem]">
            {t('jam.auth.codeDesc', { email: email.trim() })}
          </p>
          <VerifyCodeInput
            value={code}
            onChange={setCode}
            label={t('jam.auth.codeLabel')}
          />
          {error && (
            <p
              role="alert"
              className="text-brand-magenta-bright text-[0.85rem]"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            variant="hero"
            size="cta"
            disabled={busy || !/^\d{6}$/.test(code)}
            className="w-full"
          >
            {busy ? t('jam.auth.entering') : t('jam.auth.enter')}
          </Button>
          <div className="flex items-center justify-between text-[0.8rem]">
            <button
              type="button"
              className="text-brand-text-dim hover:text-foreground"
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
              }}
            >
              {t('jam.auth.changeEmail')}
            </button>
            <button
              type="button"
              className="text-brand-green disabled:text-brand-text-faint hover:underline disabled:no-underline"
              disabled={cooldown > 0 || busy}
              onClick={() => void requestCode()}
            >
              {cooldown > 0
                ? t('jam.auth.resendIn', { seconds: cooldown })
                : t('jam.auth.resend')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
