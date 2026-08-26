import { cn } from '@/lib/utils'

// The source PNG carries a wide transparent margin: the "IBM Quantum" ink
// only occupies x 15.30%–84.67%, y 39.60%–65.33% of the file, so rendering
// the file directly makes the mark look tiny inside its own box. The values
// below crop the box down to the ink itself, so a caller's `height` is the
// height of the visible wordmark.
const NAT_W = 3895
const NAT_H = 1500
const INK = { x: 0.153, y: 0.396, w: 0.6937, h: 0.2573 }

// Aspect ratio of the ink alone (works out to exactly 7:1).
const INK_ASPECT = (INK.w * NAT_W) / (INK.h * NAT_H)
// Image width as a % of the cropped box width.
const IMG_W = 100 / INK.w
// Image height as a % of the cropped box *height* (what `top` resolves against).
const IMG_H = IMG_W * (NAT_H / NAT_W) * INK_ASPECT

export function IbmLogo({
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'>) {
  return (
    <span
      className={cn('relative block overflow-hidden', className)}
      style={{ aspectRatio: `${INK_ASPECT}` }}
      {...props}
    >
      <img
        src="/ibm-logo.png"
        alt="IBM Quantum"
        className="absolute max-w-none invert"
        style={{
          width: `${IMG_W}%`,
          left: `${-INK.x * IMG_W}%`,
          top: `${-INK.y * IMG_H}%`,
        }}
      />
    </span>
  )
}
