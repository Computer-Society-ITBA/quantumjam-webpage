import type { ElementType, ReactNode, CSSProperties } from 'react'

import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  as?: ElementType
  className?: string
  style?: CSSProperties
  /** Ghost offset in pixels. Reference caps this at 8px. */
  offset?: number
}

/**
 * The "collapse" headline effect: two ghost copies (green + magenta) offset
 * a few px behind a solid white top layer, screen-blended. Reserved for the
 * wordmark and hero title only.
 */
export function RgbSplitText({
  children,
  as = 'span',
  className,
  style,
  offset = 6,
}: Props) {
  const Tag = as as 'span'
  return (
    <Tag className={cn('rgb-split', className)} style={style}>
      <span
        aria-hidden="true"
        className="rgb-split-ghost text-brand-green"
        style={{ transform: `translate(${-offset}px, ${offset * 0.5}px)` }}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className="rgb-split-ghost text-brand-magenta"
        style={{ transform: `translate(${offset}px, ${-offset * 0.5}px)` }}
      >
        {children}
      </span>
      <span className="text-brand-collapse relative">{children}</span>
    </Tag>
  )
}
