import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type StepRailItem = {
  id: string
  label: string
}

export function StepRail({
  steps,
  current,
}: {
  steps: StepRailItem[]
  current: number
}) {
  const { t } = useTranslation()
  const progress = ((current + 1) / steps.length) * 100

  return (
    <div className="mb-9">
      <div className="sm:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-brand-green truncate text-[0.8rem] font-medium">
            {steps[current].label}
          </span>
          <span className="font-display text-brand-text-dim flex-shrink-0 text-[0.72rem] font-bold tracking-[0.06em] uppercase">
            {t('registration.wizard.stepOf', {
              current: current + 1,
              total: steps.length,
            })}
          </span>
        </div>
        <div className="bg-brand-line h-px w-full">
          <div
            className="bg-brand-green h-px transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol className="hidden sm:flex sm:items-start">
        {steps.map((step, i) => {
          const done = i < current
          const active = i === current
          return (
            <li
              key={step.id}
              className={cn(
                'flex min-w-0 flex-col gap-2',
                i === steps.length - 1 ? 'flex-shrink-0' : 'flex-1',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors duration-300',
                    active
                      ? 'bg-brand-green animate-pulse-dot'
                      : done
                        ? 'bg-brand-green-strong'
                        : 'bg-brand-line',
                  )}
                />
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      'h-px flex-1 transition-colors duration-500',
                      done ? 'bg-brand-green-strong/45' : 'bg-brand-line',
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 pr-3">
                <p
                  className={cn(
                    'font-display text-[0.76rem] leading-tight font-bold tracking-[0.03em] uppercase transition-colors duration-300',
                    active
                      ? 'text-brand-green'
                      : done
                        ? 'text-brand-text-dim'
                        : 'text-brand-text-dim/55',
                  )}
                >
                  {step.label}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
