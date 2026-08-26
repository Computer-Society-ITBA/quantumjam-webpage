import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FieldError, QuantumField } from '@/components/landing/QuantumField'
import {
  MAX_TEAM_SIZE,
  emptyTeam,
  previewMembers,
  teamIdFrom,
  type TeamChoice,
  type TeamState,
} from '@/components/registration/wizard'
import { cn } from '@/lib/utils'

const CHOICES: { id: TeamChoice; ket: string }[] = [
  { id: 'join', ket: '|0⟩' },
  { id: 'create', ket: '|1⟩' },
  { id: 'alone', ket: '|+⟩' },
]

function MemberSlots({ filled }: { filled: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: MAX_TEAM_SIZE }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-2 rounded-full transition-colors duration-300',
            i < filled
              ? 'bg-brand-green'
              : 'border-brand-line border bg-transparent',
          )}
        />
      ))}
    </div>
  )
}

export function TeamStep({
  value,
  onChange,
  error,
}: {
  value: TeamState
  onChange: (next: TeamState) => void
  error?: string
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const generatedId = teamIdFrom(value.name)
  const lookupCode = teamIdFrom(value.code)
  const showLookup = lookupCode.length >= 4
  const members = showLookup ? previewMembers(lookupCode) : 0
  const isFull = showLookup && members >= MAX_TEAM_SIZE

  const copyId = async () => {
    if (!generatedId) return
    try {
      await navigator.clipboard.writeText(generatedId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FieldError id="team-error" message={error} />
      <div className="border-brand-line divide-brand-line divide-y border-y">
        {CHOICES.map((choice) => {
          const selected = value.choice === choice.id
          return (
            <button
              key={choice.id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange({ ...emptyTeam, choice: choice.id, name: value.name })
              }
              className="group flex w-full items-start gap-4 py-4 text-left"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-[34px] w-9 flex-shrink-0 items-center justify-center border-2 text-[0.78rem] font-semibold transition-colors',
                  selected
                    ? 'border-brand-green/70 bg-brand-green/10 text-brand-green'
                    : 'border-brand-line text-brand-text-dim group-hover:text-brand-green group-hover:border-brand-green/45',
                )}
              >
                {choice.ket}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'mb-0.5 block text-[1rem] font-semibold transition-colors',
                    selected
                      ? 'text-brand-green'
                      : 'text-foreground group-hover:text-brand-green',
                  )}
                >
                  {t(`registration.wizard.team.choices.${choice.id}.title`)}
                </span>
                <span className="text-brand-text-dim block max-w-[46ch] text-[0.87rem]">
                  {t(`registration.wizard.team.choices.${choice.id}.desc`)}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {value.choice === 'create' && (
        <div className="flex flex-col gap-3.5">
          <QuantumField
            label={t('registration.fields.teamName.label')}
            ghost1={t('registration.fields.teamName.ghost1')}
            ghost2={t('registration.fields.teamName.ghost2')}
            value={value.name}
            onChange={(name) => onChange({ ...value, name })}
            required
          />
          <div className="border-brand-line bg-brand-panel/60 border p-4">
            <p className="font-display text-brand-text-dim mb-2 text-[0.76rem] font-bold tracking-[0.04em] uppercase">
              {t('registration.wizard.team.create.idLabel')}
            </p>
            <div className="flex items-center justify-between gap-3">
              <code className="text-brand-green min-w-0 truncate font-sans text-[1.05rem] tracking-[0.02em]">
                {generatedId || '-'}
              </code>
              <button
                type="button"
                onClick={copyId}
                disabled={!generatedId}
                className="font-display text-brand-magenta-bright hover:text-brand-green flex-shrink-0 text-[0.76rem] font-bold tracking-[0.04em] uppercase transition-colors disabled:opacity-40"
              >
                {copied
                  ? t('registration.wizard.team.create.copied')
                  : t('registration.wizard.team.create.copy')}
              </button>
            </div>
            <p className="text-brand-text-dim mt-2.5 text-[0.78rem]">
              {t('registration.wizard.team.create.hint', {
                max: MAX_TEAM_SIZE,
              })}
            </p>
          </div>
        </div>
      )}

      {value.choice === 'join' && (
        <div className="flex flex-col gap-3.5">
          <QuantumField
            label={t('registration.fields.teamCode.label')}
            ghost1={t('registration.fields.teamCode.ghost1')}
            ghost2={t('registration.fields.teamCode.ghost2')}
            value={value.code}
            onChange={(code) => onChange({ ...value, code })}
            required
          />
          {showLookup && (
            <div
              className={cn(
                'border p-4 transition-colors',
                isFull
                  ? 'border-brand-line bg-brand-panel/40'
                  : 'border-brand-green/35 bg-brand-green/[0.04]',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <code className="text-foreground min-w-0 truncate font-sans text-[0.98rem]">
                  {lookupCode}
                </code>
                <MemberSlots filled={members} />
              </div>
              <p
                className={cn(
                  'mt-2.5 text-[0.82rem]',
                  isFull ? 'text-brand-green' : 'text-brand-text-dim',
                )}
              >
                {isFull
                  ? t('registration.wizard.team.join.full', {
                      max: MAX_TEAM_SIZE,
                    })
                  : t('registration.wizard.team.join.members', {
                      taken: members,
                      max: MAX_TEAM_SIZE,
                    })}
              </p>
            </div>
          )}
        </div>
      )}

      {value.choice === 'alone' && (
        <div className="border-brand-green/30 bg-brand-green/[0.05] border p-4">
          <p className="text-brand-text-dim text-[0.86rem]">
            {t('registration.wizard.team.alone.note', { max: MAX_TEAM_SIZE })}
          </p>
        </div>
      )}
    </div>
  )
}
