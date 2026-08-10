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
}

type TextProps = BaseProps & {
  variant?: 'text' | 'email'
}

type TextareaProps = BaseProps & {
  variant: 'textarea'
}

type QuantumFieldProps = TextProps | TextareaProps

export function QuantumField(props: QuantumFieldProps) {
  const {
    label,
    ghost1,
    ghost2,
    value,
    onChange,
    required = false,
    autoComplete,
  } = props
  const variant = 'variant' in props ? props.variant : 'text'
  const id = useId()
  const [focused, setFocused] = useState(false)
  const collapsed = focused || value.length > 0

  const isTextarea = variant === 'textarea'

  const commonClasses =
    'text-foreground relative z-[2] block h-full w-full border-none bg-transparent px-3.5 text-[0.92rem] focus:outline-none'

  return (
    <div>
      <label
        htmlFor={id}
        className="text-brand-text-dim mb-1.5 block text-[0.72rem] font-medium tracking-[0.05em] uppercase"
      >
        {label}
      </label>
      <div
        className={cn(
          'bg-brand-panel border-brand-line focus-within:border-brand-warm relative overflow-hidden rounded-md border transition-[border-color,box-shadow] duration-200 focus-within:shadow-[0_0_0_3px_rgba(201,151,79,0.16)]',
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
            className="text-brand-gold-bright absolute right-3.5 left-3.5 truncate font-sans text-[0.85rem] whitespace-nowrap opacity-70"
            style={{
              top: isTextarea ? 12 : 10,
              transform: 'rotate(-1deg)',
            }}
          >
            {ghost1}
          </span>
          <span
            className="text-brand-blue absolute right-3.5 left-3.5 truncate font-sans text-[0.85rem] whitespace-nowrap opacity-60"
            style={{
              top: isTextarea ? 36 : 32,
              transform: 'rotate(0.8deg) translateX(5px)',
            }}
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
          />
        )}
      </div>
    </div>
  )
}
