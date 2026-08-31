import { useEffect, useId, useRef, useState } from 'react'

import { FieldError, FieldLabel } from '@/components/landing/QuantumField'
import { cn } from '@/lib/utils'

export type SelectOption = {
  value: string
  label: string
}

type CustomSelectProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  required?: boolean
  error?: string
}

export function CustomSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  required = false,
  error,
}: CustomSelectProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'bg-brand-panel relative flex h-[58px] w-full items-center justify-between border px-3.5 text-left text-[0.92rem] transition-[border-color,box-shadow] duration-200 focus:outline-none',
          open && 'border-brand-green shadow-[0_0_0_3px_rgba(200,255,0,0.16)]',
          !open &&
            (error ? 'border-brand-magenta-bright' : 'border-brand-line'),
        )}
      >
        <span
          className={cn(
            'truncate',
            selected ? 'text-foreground' : 'text-brand-text-dim',
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'text-brand-text-dim ml-3 flex-shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
        >
          ⌄
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="border-brand-green bg-brand-panel absolute top-[calc(100%+4px)] left-0 z-20 max-h-64 w-full overflow-auto border shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'hover:bg-brand-line/60 block w-full px-3.5 py-3 text-left text-[0.9rem] transition-colors',
                    isSelected ? 'text-brand-green' : 'text-foreground',
                  )}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
