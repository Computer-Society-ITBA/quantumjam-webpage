import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

// How long a "moved up/down N" marker stays next to a row.
const HOLD_MS = 8000
const SLIDE_MS = 550

type Delta = { value: number; until: number }

/**
 * Animates live reordering of a ranked list. When the order changes, every
 * row that moved slides from its old spot to the new one (FLIP: measured
 * with offsetTop, so scrolling or an expanded row never fakes a move) and
 * keeps a +N / -N position change for a few seconds.
 *
 * Give each row `ref(id)` and read `deltaOf(id)`: positive moved up.
 */
export function useRankMotion(order: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>())
  const lastOrder = useRef<string[] | null>(null)
  const lastTops = useRef(new Map<string, number>())
  const [deltas, setDeltas] = useState<Record<string, Delta>>({})
  const orderKey = order.join('|')

  // 1) On a new order: slide the rows that moved and mark their change. It
  //    reads lastTops, which still holds the positions of the previous
  //    render, because effect 2 below runs after it.
  useLayoutEffect(() => {
    const prev = lastOrder.current
    const next = orderKey ? orderKey.split('|') : []
    lastOrder.current = next
    if (!prev) return
    const moved: Record<string, number> = {}
    next.forEach((id, index) => {
      const before = prev.indexOf(id)
      if (before >= 0 && before !== index) moved[id] = before - index
    })
    if (Object.keys(moved).length === 0) return
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!reduce) {
      for (const id of Object.keys(moved)) {
        const el = nodes.current.get(id)
        const from = lastTops.current.get(id)
        if (!el || from === undefined) continue
        const dy = from - el.offsetTop
        if (!dy) continue
        el.animate(
          [
            { transform: `translateY(${dy}px)` },
            { transform: 'translateY(0)' },
          ],
          { duration: SLIDE_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
        )
      }
    }
    const until = Date.now() + HOLD_MS
    setDeltas((current) => {
      const marked = { ...current }
      for (const [id, value] of Object.entries(moved)) {
        marked[id] = { value, until }
      }
      return marked
    })
  }, [orderKey])

  // 2) After every render, remember where each row sits, so a row that was
  //    expanded or resized never fakes a move on the next reorder.
  useLayoutEffect(() => {
    const tops = new Map<string, number>()
    nodes.current.forEach((el, id) => tops.set(id, el.offsetTop))
    lastTops.current = tops
  })

  // Drop markers once their time is up.
  useEffect(() => {
    const pending = Object.values(deltas)
    if (pending.length === 0) return
    const soonest = Math.min(...pending.map((d) => d.until))
    const timer = window.setTimeout(
      () => {
        const now = Date.now()
        setDeltas((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([, d]) => d.until > now),
          ),
        )
      },
      Math.max(0, soonest - Date.now()) + 20,
    )
    return () => window.clearTimeout(timer)
  }, [deltas])

  const ref = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(id, el)
      else nodes.current.delete(id)
    },
    [],
  )

  const deltaOf = (id: string) => deltas[id]?.value ?? 0

  return { ref, deltaOf }
}
