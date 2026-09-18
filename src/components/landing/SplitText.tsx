import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The "collapse" headline effect: two ghost copies (cyan + magenta) offset
 * behind a solid white top layer, screen-blended so the overlap reads as
 * white. On a hoverable pointer the two ghosts drift with the same motion
 * as the hero wordmark (see .rgb-split:hover rules in index.css). Where
 * hover isn't meaningful (404 digits) the ghosts just sit at their base
 * offset.
 */
export function SplitText({
  children,
  offset = 6,
  className,
  style,
}: {
  children: ReactNode
  offset?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span className={cn('rgb-split', className)} style={style}>
      <span
        aria-hidden="true"
        className="rgb-split-ghost text-brand-cyan"
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
    </span>
  )
}
