import { HeroField } from '@/components/landing/HeroField'
import { cn } from '@/lib/utils'

/**
 * A low-opacity interference-field texture used as a section backdrop.
 * Color is a sharp line here, never a diffuse glow/bloom.
 */
export function GradientBackdrop({
  className,
  vignette = false,
  glow = 1.6,
  dim = 0.85,
}: {
  className?: string
  /**
   * Fades the texture out toward the edges so it stays concentrated in the
   * middle and blends into the surrounding sections, instead of being cut
   * off at a hard line by the section's `overflow-hidden`.
   */
  vignette?: boolean
  /** Passed through to the field; higher = brighter fringe halo. */
  glow?: number
  /** Passed through to the field's alpha scale (0-1, or the legacy `true` = 0.6). */
  dim?: boolean | number
}) {
  const fade = 'radial-gradient(ellipse at center, #000 30%, transparent 75%)'
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2 overflow-hidden',
        className,
      )}
      style={vignette ? { maskImage: fade, WebkitMaskImage: fade } : undefined}
    >
      <HeroField dim={dim} glow={glow} />
    </div>
  )
}
