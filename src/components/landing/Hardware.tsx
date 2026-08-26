import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application } from '@splinetool/runtime'

import { SectionHeading } from '@/components/landing/SectionHeading'
import { cn } from '@/lib/utils'
import type { Motion } from './spin'
import { chipAngle, clamp01, damp, easeInOutCubic, smoothstep } from './spin'
import { QuantumComputerModel } from './QuantumComputerModel'

const Spline = lazy(() => import('@splinetool/react-spline'))

const PIN_SCROLL_VH = 160
// Scroll fraction spent dwelling on the copper model before the swoop to
// the chip begins. The swap then happens across the remaining scroll, so a
// higher value means a longer dwell and a quicker swap.
const MOVE_START = 0.68
// How far each scene slides, as a % of the viewport box. Below 100 the two
// overlap and crossfade instead of behaving like separate slides, which
// reads as a tighter, quicker swap.
const TRAVEL_PCT = 62
// How aggressively the damped scroll value chases the real one. Higher is
// snappier and closer to raw scroll; lower is smoother but laggier. At 7
// the value trails real scroll by ~2 frames - enough to absorb wheel-step
// jitter without feeling disconnected from the scroll.
const SMOOTH_RATE = 7

// The chip is three separate objects, so orbiting the camera around the
// middle piece keeps the assembly rigid by construction and leaves the
// lights alone. This requires camera motion to be OFF in the Spline scene
// itself - with the scene's orbit controls enabled, their per-frame
// update() drags the camera back and the chip jitters and rests off-front.
const SPLINE_CAMERA_NAME = 'Camera'
const SPLINE_PIVOT_NAME = 'Cube'
// The chip picks up the handoff at speed and decelerates into a stop. Its
// clock starts when it becomes visible and resets while hidden, so the
// entrance replays identically when scrolling back up and down.
const CHIP_VISIBLE_FROM = 0.1

// Spline re-exports keep the same scene URL and the response carries no
// Cache-Control, so browsers happily serve a stale copy - and every
// texture is embedded in this one file. Bump on each re-export to force
// a fresh fetch. (The runtime logs a benign warning about the URL not
// ending in `.splinecode`; the fetch itself is unaffected.)
const SPLINE_SCENE_VERSION = 3
const SPLINE_SCENE_URL = `https://prod.spline.design/qoHw69RsZBVCG4Ca/scene.splinecode?v=${SPLINE_SCENE_VERSION}`

function useSplineChipSpin(motion: Motion) {
  const appRef = useRef<Application | null>(null)

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    // Seconds since the chip became visible; drives its decelerating turn.
    let elapsed = 0
    let start: {
      camX: number
      camZ: number
      yaw: number
      pivotX: number
      pivotZ: number
    } | null = null

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const delta = (now - last) / 1000
      last = now

      const app = appRef.current
      if (!app) return

      if (!start) {
        const cam = app.findObjectByName(SPLINE_CAMERA_NAME)
        const pivot = app.findObjectByName(SPLINE_PIVOT_NAME)
        if (!cam || !pivot) return
        start = {
          camX: cam.position.x,
          camZ: cam.position.z,
          yaw: cam.rotation.y,
          pivotX: pivot.position.x,
          pivotZ: pivot.position.z,
        }
      }

      const cam = app.findObjectByName(SPLINE_CAMERA_NAME)
      if (!cam) return

      // Restart the clock while hidden so every entrance is identical.
      elapsed = motion.move < CHIP_VISIBLE_FROM ? 0 : elapsed + delta
      // Derived rather than accumulated, so it can't drift off its target
      // and always lands exactly on a whole turn (the chip's front).
      const angle = chipAngle(elapsed)

      const dx = start.camX - start.pivotX
      const dz = start.camZ - start.pivotZ
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      cam.position.x = start.pivotX + dx * cos + dz * sin
      cam.position.z = start.pivotZ - dx * sin + dz * cos
      // Yaw by the same angle so the camera keeps facing the pivot.
      cam.rotation.y = start.yaw + angle
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [motion])

  return (app: Application) => {
    appRef.current = app
  }
}

/**
 * Drives the model→chip swap from a single rAF loop. Scroll position is
 * damped toward its target rather than applied raw, which removes the
 * jitter of discrete wheel steps, and every per-frame value is written
 * straight to DOM refs / the shared motion object - so scrolling never
 * re-renders React (which previously re-rendered both WebGL subtrees).
 */
function useHardwareMotion() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)
  const motionRef = useRef<Motion>({ move: 0 })
  const [pinned, setPinned] = useState(false)
  const pinnedRef = useRef(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const wide = window.matchMedia('(min-width: 768px)')

    const sync = () => {
      const next = wide.matches && !reduced.matches
      pinnedRef.current = next
      setPinned(next)
    }

    sync()
    reduced.addEventListener('change', sync)
    wide.addEventListener('change', sync)
    return () => {
      reduced.removeEventListener('change', sync)
      wide.removeEventListener('change', sync)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let smooth = 0

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      // Clamp delta so a backgrounded tab doesn't jump the animation.
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now

      const section = sectionRef.current
      if (!section) return

      if (!pinnedRef.current) {
        motionRef.current.move = 1
        return
      }

      const rect = section.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      const raw = scrollable > 0 ? clamp01(-rect.top / scrollable) : 1
      const target = clamp01((raw - MOVE_START) / (1 - MOVE_START))

      smooth = damp(smooth, target, SMOOTH_RATE, delta)
      const eased = easeInOutCubic(smooth)
      motionRef.current.move = eased

      const offset = eased * TRAVEL_PCT
      const model = modelRef.current
      if (model) {
        model.style.transform = `translate3d(0, ${-offset}%, 0)`
        model.style.opacity = String(1 - smoothstep(0.45, 0.9, eased))
      }
      const chip = chipRef.current
      if (chip) {
        chip.style.transform = `translate3d(0, ${TRAVEL_PCT - offset}%, 0)`
        chip.style.opacity = String(smoothstep(0.1, 0.55, eased))
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return { sectionRef, modelRef, chipRef, motionRef, pinned }
}

type SpecLine = { labelKey: string; valueKey: string }
const specs: SpecLine[] = [
  {
    labelKey: 'hardware.specs.qubit_label',
    valueKey: 'hardware.specs.qubit_value',
  },
  {
    labelKey: 'hardware.specs.temp_label',
    valueKey: 'hardware.specs.temp_value',
  },
  {
    labelKey: 'hardware.specs.control_label',
    valueKey: 'hardware.specs.control_value',
  },
  {
    labelKey: 'hardware.specs.arch_label',
    valueKey: 'hardware.specs.arch_value',
  },
]

export function Hardware() {
  const { t } = useTranslation()
  const { sectionRef, modelRef, chipRef, motionRef, pinned } =
    useHardwareMotion()
  const onSplineLoad = useSplineChipSpin(motionRef.current)

  return (
    <section
      id="hardware"
      ref={sectionRef}
      className="bg-brand-bg border-brand-line relative z-10 border-b"
      style={
        pinned ? { height: `calc(100vh + ${PIN_SCROLL_VH}vh)` } : undefined
      }
    >
      <div
        className={cn(
          'px-[clamp(20px,6vw,80px)] py-[clamp(40px,6vw,80px)]',
          pinned && 'sticky top-0 h-screen overflow-hidden',
        )}
      >
        <SectionHeading index="03">{t('hardware.title')}</SectionHeading>
        <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative aspect-square w-full overflow-hidden">
            {pinned && (
              <div
                ref={modelRef}
                className="absolute inset-0 will-change-[transform,opacity]"
              >
                <QuantumComputerModel
                  className="h-full w-full"
                  motion={motionRef.current}
                />
              </div>
            )}
            <div
              ref={chipRef}
              className={cn(
                'absolute inset-0',
                pinned && 'opacity-0 will-change-[transform,opacity]',
              )}
            >
              <Suspense fallback={null}>
                <Spline
                  scene={SPLINE_SCENE_URL}
                  onLoad={onSplineLoad}
                  style={{
                    background: 'transparent',
                    width: '100%',
                    height: '100%',
                  }}
                />
              </Suspense>
              {/* Spline's "Built with Spline" badge is drawn onto the WebGL
                  canvas itself (not a DOM node), so it can't be targeted
                  with CSS - mask it with an opaque corner block instead. */}
              <div
                aria-hidden="true"
                className="bg-brand-bg pointer-events-none absolute right-0 bottom-0 h-20 w-56"
              />
            </div>
          </div>
          <div>
            <p className="text-brand-text-dim max-w-[58ch] font-light">
              {t('hardware.description')}
            </p>
            <ul className="border-brand-line mt-[1.3rem] flex list-none flex-col gap-[9px] border-t pt-[1.1rem]">
              {specs.map((s) => (
                <li
                  key={s.labelKey}
                  className="text-brand-text-dim flex items-baseline gap-[10px] text-[0.8rem]"
                >
                  <b className="font-display text-brand-green min-w-[110px] font-bold tracking-[0.05em] uppercase">
                    {t(s.labelKey)}
                  </b>
                  <span>{t(s.valueKey)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
