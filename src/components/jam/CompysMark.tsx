import { cn } from '@/lib/utils'

/**
 * The Compys coin. Square pixel art, sized relative to the surrounding text
 * by default; pass a size-* class to pin it.
 */
export function CompysMark({ className }: { className?: string }) {
  return (
    <img
      src="/compy.png"
      alt=""
      aria-hidden="true"
      className={cn(
        'inline-block size-[1.35em] shrink-0 align-middle [image-rendering:pixelated]',
        className,
      )}
    />
  )
}
