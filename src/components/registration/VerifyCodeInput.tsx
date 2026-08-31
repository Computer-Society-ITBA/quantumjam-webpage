import { useId, useRef } from 'react'

import { FieldError } from '@/components/landing/QuantumField'
import { CODE_LENGTH } from '@/components/registration/wizard'
import { cn } from '@/lib/utils'

export function VerifyCodeInput({
  value,
  onChange,
  label,
  error,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  error?: string
}) {
  const errorId = `${useId()}-error`
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  const focus = (index: number) => {
    boxes.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus()
  }

  const splice = (index: number, digits: string) => {
    const chars = value.padEnd(CODE_LENGTH, ' ').slice(0, CODE_LENGTH).split('')
    if (digits) {
      for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
        chars[index + i] = digits[i]
      }
      focus(index + digits.length)
    } else {
      chars[index] = ' '
    }
    onChange(chars.join(''))
  }

  return (
    <div>
      <div className="flex gap-2 sm:gap-2.5" role="group" aria-label={label}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const digit = /\d/.test(value[i] ?? '') ? value[i] : ''
          return (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={CODE_LENGTH}
              aria-label={`${label} ${i + 1}`}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              value={digit}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '')
                if (digits) splice(i, digits)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                  e.preventDefault()
                  if (digit) splice(i, '')
                  else if (i > 0) {
                    splice(i - 1, '')
                    focus(i - 1)
                  }
                }
                if (e.key === 'ArrowLeft') focus(i - 1)
                if (e.key === 'ArrowRight') focus(i + 1)
              }}
              onPaste={(e) => {
                e.preventDefault()
                const digits = e.clipboardData
                  .getData('text')
                  .replace(/\D/g, '')
                if (digits) splice(i, digits)
              }}
              onFocus={(e) => e.currentTarget.select()}
              className={cn(
                'bg-brand-panel text-foreground h-[58px] w-full min-w-0 border text-center font-sans text-[1.15rem] tabular-nums',
                'transition-[border-color,box-shadow,color] duration-200',
                'focus:border-brand-green focus:shadow-[0_0_0_3px_rgba(200,255,0,0.16)] focus:outline-none',
                error
                  ? 'border-brand-magenta-bright'
                  : digit
                    ? 'border-brand-green-strong/55 text-brand-green'
                    : 'border-brand-line',
              )}
            />
          )
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}
