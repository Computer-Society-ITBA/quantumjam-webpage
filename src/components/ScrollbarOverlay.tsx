import { useEffect, useRef } from 'react'

const MIN_THUMB = 48

/**
 * A scrollbar that floats over the page content instead of sitting in an
 * opaque gutter beside it. The native page scrollbar is hidden in CSS; this
 * mirrors scroll position and supports dragging the thumb.
 */
export function ScrollbarOverlay() {
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    const thumb = thumbRef.current
    if (!track || !thumb) return

    let frame = 0

    const metrics = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const trackH = track.clientHeight
      const thumbH = Math.max(
        MIN_THUMB,
        trackH * (window.innerHeight / doc.scrollHeight),
      )
      return { scrollable, trackH, thumbH, range: trackH - thumbH }
    }

    const layout = () => {
      const { scrollable, thumbH, range } = metrics()
      if (scrollable <= 1) {
        track.style.opacity = '0'
        return
      }
      track.style.opacity = '1'
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable))
      thumb.style.height = `${thumbH}px`
      thumb.style.transform = `translate3d(0, ${progress * range}px, 0)`
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(layout)
    }

    layout()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // rAF is throttled while the tab is hidden, so a scroll that happened
    // before hiding can leave the thumb stale. Re-sync on the way back.
    document.addEventListener('visibilitychange', layout)
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)

    let dragFrom = 0
    let scrollFrom = 0
    let dragging = false

    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      dragFrom = e.clientY
      scrollFrom = window.scrollY
      thumb.setPointerCapture(e.pointerId)
      document.body.style.userSelect = 'none'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const { scrollable, range } = metrics()
      if (range <= 0) return
      const delta = e.clientY - dragFrom
      window.scrollTo({
        top: scrollFrom + (delta / range) * scrollable,
        // The page sets scroll-behavior: smooth, which would lag the drag.
        behavior: 'instant',
      })
    }

    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      if (thumb.hasPointerCapture(e.pointerId)) {
        thumb.releasePointerCapture(e.pointerId)
      }
      document.body.style.userSelect = ''
    }

    thumb.addEventListener('pointerdown', onPointerDown)
    thumb.addEventListener('pointermove', onPointerMove)
    thumb.addEventListener('pointerup', onPointerUp)
    thumb.addEventListener('pointercancel', onPointerUp)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', layout)
      observer.disconnect()
      thumb.removeEventListener('pointerdown', onPointerDown)
      thumb.removeEventListener('pointermove', onPointerMove)
      thumb.removeEventListener('pointerup', onPointerUp)
      thumb.removeEventListener('pointercancel', onPointerUp)
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 right-[3px] z-50 h-screen w-2.5 py-3"
    >
      {/* The padding sits on the wrapper so the measured track height (and
          therefore the thumb's travel) is inset from the viewport edges. */}
      <div
        ref={trackRef}
        className="relative h-full w-full transition-opacity duration-200"
      >
        <div
          ref={thumbRef}
          className="bg-brand-line hover:bg-brand-green pointer-events-auto w-full cursor-grab rounded-full transition-colors active:cursor-grabbing"
        />
      </div>
    </div>
  )
}
