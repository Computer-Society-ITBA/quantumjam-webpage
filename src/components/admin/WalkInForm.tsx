import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FieldLabel } from '@/components/landing/QuantumField'
import { Button } from '@/components/ui/button'
import type { CheckInResult, WalkInValues } from '@/lib/adminApi'
import { INPUT_CLASSES } from './inputClasses'

const EMPTY: WalkInValues = { name: '', age: '', university: '' }

const FIELDS: { key: keyof WalkInValues; props?: object }[] = [
  { key: 'name', props: { autoComplete: 'off' } },
  {
    key: 'age',
    props: { type: 'number', min: 10, max: 120, inputMode: 'numeric' },
  },
  { key: 'university', props: { autoComplete: 'off' } },
]

export function WalkInForm({
  onSubmit,
}: {
  onSubmit: (values: WalkInValues) => Promise<CheckInResult>
}) {
  const { t } = useTranslation()
  const baseId = useId()
  const [values, setValues] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<
    CheckInResult | { result: 'error' } | null
  >(null)

  const set =
    (key: keyof WalkInValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setFeedback(null)
    try {
      const res = await onSubmit(values)
      setFeedback(res)
      if (res.result === 'ok') setValues(EMPTY)
    } catch {
      setFeedback({ result: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-[420px] flex-col gap-3.5"
    >
      {FIELDS.map(({ key, props }) => (
        <div key={key}>
          <FieldLabel
            htmlFor={`${baseId}-${key}`}
            label={t(`admin.walkIn.${key}`)}
            required
          />
          <input
            id={`${baseId}-${key}`}
            className={INPUT_CLASSES}
            value={values[key]}
            onChange={set(key)}
            required
            {...props}
          />
        </div>
      ))}

      <div aria-live="polite" className="min-h-6 text-[0.85rem]">
        {feedback?.result === 'ok' && (
          <p className="text-brand-green">
            {t('admin.walkIn.ok', { name: feedback.label })}
          </p>
        )}
        {feedback?.result === 'invalid' && (
          <p className="text-brand-magenta-bright">
            {t('admin.walkIn.invalid')}
          </p>
        )}
        {feedback?.result === 'error' && (
          <p className="text-brand-magenta-bright">
            {t('admin.scanner.error')}
          </p>
        )}
      </div>

      <Button
        type="submit"
        variant="hero"
        size="cta"
        disabled={busy}
        className="w-full"
      >
        {busy ? t('admin.walkIn.submitting') : t('admin.walkIn.submit')}
      </Button>
    </form>
  )
}
