import { useEffect, useRef, type CSSProperties } from 'react'

import {
  COMPY_BACK,
  COMPY_COLORS,
  COMPY_COLS,
  COMPY_FRONT,
  COMPY_RIM_BANDS,
  COMPY_ROWS,
} from '@/components/jam/compyGrid'
import { cn } from '@/lib/utils'

// The glare is a diagonal band that hops one cell at a time across both
// faces, then rests before the next pass: GLARE_CORE bright diagonals with
// one soft diagonal on each side.
const GLARE_CORE = 4
const GLARE_STEP_MS = 25
const GLARE_SWEEP_MS =
  (COMPY_COLS + COMPY_ROWS + GLARE_CORE + 4) * GLARE_STEP_MS
const GLARE_PERIOD_MS = GLARE_SWEEP_MS + 1500

// Rim thickness, in columns of the pixel grid.
const THICKNESS = 2

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const channel = (v: number) => Math.min(255, Math.round(v * factor))
  return `rgb(${channel(n >> 16)}, ${channel((n >> 8) & 255)}, ${channel(n & 255)})`
}

const filled = (x: number, y: number) =>
  x >= 0 &&
  y >= 0 &&
  x < COMPY_COLS &&
  y < COMPY_ROWS &&
  COMPY_FRONT[y][x] !== '.'

type Edge = { style: CSSProperties }

// Every outline segment of the front silhouette becomes one face of the
// rim, sized with the --s custom property so the coin scales with its font.
// A light shade per direction makes the rim read as volume.
const EDGES: Edge[] = (() => {
  const fx = (v: number) => `calc(var(--s) * ${v / COMPY_COLS})`
  const fy = (v: number) => `calc(var(--s) * ${v / COMPY_ROWS})`
  const half = `calc(var(--s) * ${THICKNESS / COMPY_COLS / 2})`
  const depth = `calc(var(--s) * ${THICKNESS / COMPY_COLS})`
  const out: Edge[] = []
  for (let y = 0; y < COMPY_ROWS; y++) {
    for (let x = 0; x < COMPY_COLS; x++) {
      if (!filled(x, y)) continue
      const band = COMPY_RIM_BANDS[(x + y) % 2]
      const horizontal = (row: number, factor: number) => ({
        style: {
          left: `calc(${fx(x)} - 0.3px)`,
          top: `calc(${fy(row)} - ${half})`,
          width: `calc(${fx(1)} + 0.6px)`,
          height: depth,
          background: shade(band, factor),
          transform: 'rotateX(90deg)',
        },
      })
      const vertical = (col: number, factor: number) => ({
        style: {
          left: `calc(${fx(col)} - ${half})`,
          top: `calc(${fy(y)} - 0.3px)`,
          width: depth,
          height: `calc(${fy(1)} + 0.6px)`,
          background: shade(band, factor),
          transform: 'rotateY(90deg)',
        },
      })
      if (!filled(x, y - 1)) out.push(horizontal(y, 1.2))
      if (!filled(x, y + 1)) out.push(horizontal(y + 1, 0.8))
      if (!filled(x - 1, y)) out.push(vertical(x, 0.92))
      if (!filled(x + 1, y)) out.push(vertical(x + 1, 1.06))
    }
  }
  return out
})()

function paint(
  canvas: HTMLCanvasElement,
  grid: string[],
  glare: number | null,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  const cw = width / COMPY_COLS
  const ch = height / COMPY_ROWS
  ctx.clearRect(0, 0, width, height)
  for (let y = 0; y < COMPY_ROWS; y++) {
    for (let x = 0; x < COMPY_COLS; x++) {
      const key = grid[y][x]
      if (key === '.') continue
      const x0 = Math.round(x * cw)
      const y0 = Math.round(y * ch)
      const w = Math.round((x + 1) * cw) - x0
      const h = Math.round((y + 1) * ch) - y0
      ctx.fillStyle = COMPY_COLORS[key]
      ctx.fillRect(x0, y0, w, h)
      if (glare === null) continue
      const d = x + y
      const alpha =
        d <= glare && d > glare - GLARE_CORE
          ? 0.72
          : d === glare + 1 || d === glare - GLARE_CORE
            ? 0.3
            : 0
      if (alpha) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fillRect(x0, y0, w, h)
      }
    }
  }
}

/**
 * The Compys coin in 3D: the pixel art extruded into a real coin with a
 * banded rim, always spinning, with a pixel glare sweeping both faces.
 * `size` is any CSS length; in em it follows the surrounding text.
 */
export function Compy3D({
  size,
  className,
}: {
  size: string
  className?: string
}) {
  const root = useRef<HTMLSpanElement>(null)
  const front = useRef<HTMLCanvasElement>(null)
  const back = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = root.current
    const faces: [HTMLCanvasElement | null, string[]][] = [
      [front.current, COMPY_FRONT],
      [back.current, COMPY_BACK],
    ]
    let glare: number | null = null

    // Canvas resolution follows the rendered size, so the art stays crisp.
    const resize = () => {
      if (!el) return
      const px = Math.max(
        1,
        Math.round(el.clientWidth * Math.max(2, window.devicePixelRatio || 1)),
      )
      for (const [canvas, grid] of faces) {
        if (!canvas) continue
        canvas.width = px
        canvas.height = px
        paint(canvas, grid, glare)
      }
    }
    resize()
    const observer = new ResizeObserver(resize)
    if (el) observer.observe(el)

    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    let raf = 0
    const tick = (now: number) => {
      const t = now % GLARE_PERIOD_MS
      const next =
        t < GLARE_SWEEP_MS
          ? Math.floor(t / GLARE_STEP_MS) - (GLARE_CORE + 1)
          : null
      if (next !== glare) {
        glare = next
        for (const [canvas, grid] of faces)
          if (canvas) paint(canvas, grid, glare)
      }
      raf = requestAnimationFrame(tick)
    }
    if (!reduced) raf = requestAnimationFrame(tick)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  const faceStyle = (back: boolean): CSSProperties => ({
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transform: `${back ? 'rotateY(180deg) ' : ''}translateZ(calc(var(--s) * ${THICKNESS / COMPY_COLS / 2}))`,
  })

  return (
    <span
      ref={root}
      aria-hidden="true"
      className={cn('inline-block shrink-0', className)}
      style={
        {
          '--s': size,
          width: 'var(--s)',
          height: 'var(--s)',
          perspective: 'calc(var(--s) * 4)',
        } as CSSProperties
      }
    >
      <span
        className="compy-spin relative block size-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {EDGES.map((edge, i) => (
          <span key={i} className="absolute block" style={edge.style} />
        ))}
        <canvas
          ref={front}
          className="absolute top-0 left-0 size-full"
          style={faceStyle(false)}
        />
        <canvas
          ref={back}
          className="absolute top-0 left-0 size-full"
          style={faceStyle(true)}
        />
      </span>
    </span>
  )
}
