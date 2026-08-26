import { useId, useState } from 'react'

import { cn } from '@/lib/utils'

type BaseProps = {
  label: string
  ghost1: string
  ghost2: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  autoComplete?: string
  error?: string
}

type TextProps = BaseProps & {
  variant?: 'text' | 'email'
}

type TextareaProps = BaseProps & {
  variant: 'textarea'
}

type QuantumFieldProps = TextProps | TextareaProps

export function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string
  label: string
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-brand-text-dim mb-1.5 block text-[0.78rem] font-medium"
    >
      {label}
      {required && (
        <span aria-hidden="true" className="text-brand-green">
          {' '}
          *
        </span>
      )}
    </label>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className="text-brand-magenta-bright mt-1.5 text-[0.78rem]"
    >
      {message}
    </p>
  )
}

export function QuantumField(props: QuantumFieldProps) {
  const {
    label,
    ghost1,
    ghost2,
    value,
    onChange,
    required = false,
    autoComplete,
    error,
  } = props
  const variant = 'variant' in props ? props.variant : 'text'
  const id = useId()
  const errorId = `${id}-error`
  const [focused, setFocused] = useState(false)
  const collapsed = focused || value.length > 0

  const isTextarea = variant === 'textarea'

  const commonClasses =
    'text-foreground relative z-[2] block h-full w-full border-none bg-transparent px-3.5 text-[0.92rem] focus:outline-none'

  return (
    <div>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div
        className={cn(
          'bg-brand-panel focus-within:border-brand-green relative overflow-hidden border transition-[border-color,box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_rgba(180,255,57,0.16)]',
          error ? 'border-brand-magenta-bright' : 'border-brand-line',
          isTextarea ? 'h-[88px]' : 'h-[58px]',
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300',
            collapsed && 'opacity-0',
          )}
        >
          <span
            className={cn(
              'ghost-alt text-brand-green',
              isTextarea && 'ghost-alt-top',
            )}
          >
            {ghost1}
          </span>
          <span
            className={cn(
              'ghost-alt ghost-alt-b text-brand-magenta-bright',
              isTextarea && 'ghost-alt-top',
            )}
          >
            {ghost2}
          </span>
        </div>

        {isTextarea ? (
          <textarea
            id={id}
            className={cn(commonClasses, 'block resize-none py-3')}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            required={required}
            autoComplete={autoComplete ?? 'off'}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
        ) : (
          <input
            id={id}
            type={variant}
            className={commonClasses}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            required={required}
            autoComplete={autoComplete ?? 'off'}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
        )}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}
