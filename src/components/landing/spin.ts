const TAU = Math.PI * 2

/**
 * Shared, mutable motion state for the hardware section. Written once per
 * frame by the section's rAF loop and read by the two 3D scenes, so scroll
 * never triggers a React re-render.
 */
export type Motion = { move: number }

// --- Copper model: gentle idle, then a sudden all-at-once wind-up -------

/** Idle drift, in rad/s - slow but clearly moving (~3.3 RPM). */
export const MODEL_IDLE_SPEED = 0.35
/** Peak extra speed at the moment of handoff, in rad/s. */
export const MODEL_BURST_SPEED = 11
/**
 * High exponent so the burst stays dormant through most of the scroll and
 * then hits abruptly, rather than ramping the whole way up.
 */
const MODEL_BURST_EXP = 5

export function modelSpinSpeed(move: number) {
  return MODEL_IDLE_SPEED + MODEL_BURST_SPEED * move ** MODEL_BURST_EXP
}

// --- Chip: one quick decelerating turn that lands back on its front -----

/**
 * Whole turns, so the settle lands exactly where it started - the chip's
 * front. Because the curve starts at 0 and asymptotes to CHIP_TURNS * TAU,
 * the chip both *enters* front-facing and *comes to rest* front-facing.
 */
export const CHIP_TURNS = 1
/**
 * Decay rate, 1/s. The curve's initial speed is CHIP_TURNS * TAU * decay,
 * so deriving it from the model's peak makes the handoff velocity-continuous
 * - the chip picks up exactly the speed the copper model was spinning at,
 * instead of visibly jumping to a different rate. Settles within 1° of its
 * front in ln(360) / CHIP_DECAY ≈ 3.3s.
 */
export const CHIP_DECAY =
  (MODEL_IDLE_SPEED + MODEL_BURST_SPEED) / (CHIP_TURNS * TAU)

/**
 * Angle at `t` seconds after the chip appears: fast off the line, then
 * easing to a stop at a whole number of turns.
 */
export function chipAngle(t: number) {
  return CHIP_TURNS * TAU * (1 - Math.exp(-CHIP_DECAY * t))
}

// --- Scroll helpers -----------------------------------------------------

export function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/** Smooth 0→1 ramp across [edge0, edge1]. */
export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Frame-rate independent exponential smoothing. `rate` is roughly how
 * aggressively `current` chases `target` (higher = snappier).
 */
export function damp(
  current: number,
  target: number,
  rate: number,
  delta: number,
) {
  return current + (target - current) * (1 - Math.exp(-rate * delta))
}
