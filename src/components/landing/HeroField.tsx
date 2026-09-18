import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /**
   * Lower intensity for use as a smaller decorative texture. `true` uses
   * the default 0.6 alpha scale; pass a number (0-1) to dial it in.
   */
  dim?: boolean | number
  density?: number
  speed?: number
  weight?: number
  mouseAmt?: number
  glow?: number
  /**
   * Fraction of CSS pixels to render at, before DPR is applied. Defaults to
   * 1 (full CSS-pixel resolution). Drop to 0.75-0.85 on instances where the
   * pattern is dim enough that the softening doesn't read; the canvas is
   * stretched by CSS to fill the mount, so it's a straight fragment-shading
   * win. Below ~0.5 the interference lines start looking blurry.
   */
  renderScale?: number
  /**
   * Max FPS the animation loop targets. Interference at 45 fps is visually
   * indistinguishable from 120 fps but costs a third as much on a high
   * refresh rate display.
   */
  fpsCap?: number
}

const MOTION_REFERENCE_HEIGHT = 520

// Full-screen triangle via gl_VertexID - no vertex buffer needed.
const vertexShaderSource = /* glsl */ `#version 300 es
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`

// Two interfering wave sources rendered as thin fringe lines (uC1/uC2,
// pulled from the --brand-green/--brand-magenta CSS tokens at mount), with
// a click-triggered ripple that decays over ~4s. Ported near-verbatim from
// the reference shader; the only addition is deriving alpha from the same
// line/halo intensity that drives brightness (the original always output
// opaque), plus uAlphaScale so this can also run dim, masked, and layered
// under other sections (see GradientBackdrop).
const fragmentShaderSource = /* glsl */ `#version 300 es
precision highp float;
out vec4 O;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform vec3  uPulse;
uniform float uDensity, uSpeed, uMotionScale, uWeight, uMouseAmt, uGlow, uAlphaScale;
uniform vec3  uC1, uC2;

float ln(float v, float w){
  float g = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-6);
  return 1.0 - smoothstep(0.0, w, g);
}
float halo(float v, float w){
  float g = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-6);
  return 1.0 - smoothstep(0.0, w * 7.0, g);
}
float pulse(vec2 p){
  float age = uTime - uPulse.z;
  if(age > 4.0 || age < 0.0) return 0.0;
  float d = distance(p, uPulse.xy);
  return sin(d * 15.0 - age * 8.0) * exp(-d * 2.0) * exp(-age * 1.4) * 1.7;
}

void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * uSpeed * uMotionScale;
  vec2 m = uMouse * uMouseAmt;

  vec2 s1 = vec2(-0.75, -0.55) + m * 0.16;
  vec2 s2 = vec2( 0.75, -0.55) - m * 0.16;
  float r1 = distance(p, s1), r2 = distance(p, s2);

  float k = 20.0 * uDensity;
  float fr = abs(cos(k * (r1 - r2) * 0.5 - t * 0.9 + pulse(p) * 0.5));

  float u = p.x * 44.0 * uDensity + t * 0.12;
  float l = ln(u, uWeight * (0.22 + 2.3 * fr * fr));
  // Bias the color mix toward magenta (uC2). fr spends more time near its
  // extremes than in the middle, so a linear mix ends up green-dominated;
  // pow(fr, 1.4) pulls mid values down without changing the underlying
  // geometry that drives line width and glow.
  vec3 col = mix(uC2, uC1, pow(fr, 1.4));
  float intensity = (l + halo(u, uWeight) * uGlow * fr * 0.28) * uAlphaScale;
  O = vec4(col * intensity, intensity);
}
`

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  )
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
}

/** Resolves a CSS custom property (any valid CSS color, including oklch())
 *  to sRGB 0-1 floats by letting the canvas 2D context do the parsing. */
function resolveCssColor(varName: string): [number, number, number] {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return [1, 1, 1]
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255]
}

export function HeroField({
  className,
  dim = false,
  density = 1,
  speed = 0.56,
  weight = 1,
  mouseAmt = 1,
  glow = 1,
  renderScale = 1,
  fpsCap = 45,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let width = mount.clientWidth
    let height = mount.clientHeight
    if (width === 0 || height === 0) return

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    mount.appendChild(canvas)

    // powerPreference hints hybrid systems to keep this on the iGPU. It's a
    // decorative background - there's no reason for a discrete GPU to spin
    // up for it, and forcing low-power also keeps battery/thermals down.
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    })
    if (!gl) return

    const program = createProgram(gl)
    if (!program) return
    gl.useProgram(program)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const u = {
      res: gl.getUniformLocation(program, 'uRes'),
      time: gl.getUniformLocation(program, 'uTime'),
      mouse: gl.getUniformLocation(program, 'uMouse'),
      pulse: gl.getUniformLocation(program, 'uPulse'),
      density: gl.getUniformLocation(program, 'uDensity'),
      speed: gl.getUniformLocation(program, 'uSpeed'),
      motionScale: gl.getUniformLocation(program, 'uMotionScale'),
      weight: gl.getUniformLocation(program, 'uWeight'),
      mouseAmt: gl.getUniformLocation(program, 'uMouseAmt'),
      glow: gl.getUniformLocation(program, 'uGlow'),
      alphaScale: gl.getUniformLocation(program, 'uAlphaScale'),
      c1: gl.getUniformLocation(program, 'uC1'),
      c2: gl.getUniformLocation(program, 'uC2'),
    }

    const [c1r, c1g, c1b] = resolveCssColor('--brand-green')
    const [c2r, c2g, c2b] = resolveCssColor('--brand-magenta')

    gl.uniform1f(u.density, density)
    gl.uniform1f(u.speed, speed)
    gl.uniform1f(u.weight, weight)
    gl.uniform1f(u.mouseAmt, mouseAmt)
    gl.uniform1f(u.glow, glow)
    gl.uniform1f(u.alphaScale, typeof dim === 'number' ? dim : dim ? 0.6 : 1)
    gl.uniform3f(u.c1, c1r, c1g, c1b)
    gl.uniform3f(u.c2, c2r, c2g, c2b)

    let t0 = performance.now()

    // Cap effective DPR at 1.5 - retina screens don't need a full 2x for a
    // soft interference pattern (the shader's fwidth-based antialiasing keeps
    // line sharpness roughly constant across densities). Combined with an
    // optional renderScale this is a big fragment-budget saving; the FPS cap
    // and offscreen pause do the rest.
    const pixelScale = Math.min(window.devicePixelRatio || 1, 1.5) * renderScale
    const setSize = (w: number, h: number) => {
      width = w
      height = h
      canvas.width = Math.max(1, Math.round(w * pixelScale))
      canvas.height = Math.max(1, Math.round(h * pixelScale))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(u.res, canvas.width, canvas.height)
      gl.uniform1f(u.motionScale, MOTION_REFERENCE_HEIGHT / h)
    }
    setSize(width, height)

    // Pointer state lives in normalized DOM space (0-1, y-down from top of
    // the mount) and is converted to the shader's centered/y-up field space
    // each frame, smoothed by exponential interpolation toward the target.
    const mouseTarget = { x: 0.5, y: 0.5 }
    const mouseSmooth = { x: 0.5, y: 0.5 }

    const toFieldSpace = (nx: number, ny: number) => {
      const px = nx * canvas.width
      const pyFromBottom = canvas.height - ny * canvas.height
      return [
        (px - 0.5 * canvas.width) / canvas.height,
        (pyFromBottom - 0.5 * canvas.height) / canvas.height,
      ] as const
    }

    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      mouseTarget.x = (e.clientX - rect.left) / rect.width
      mouseTarget.y = (e.clientY - rect.top) / rect.height
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const onDown = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const nx = (e.clientX - rect.left) / rect.width
      const ny = (e.clientY - rect.top) / rect.height
      const [fx, fy] = toFieldSpace(nx, ny)
      gl.uniform3f(u.pulse, fx, fy, (performance.now() - t0) / 1000)
    }
    window.addEventListener('pointerdown', onDown, { passive: true })

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0 || (w === width && h === height)) return
      setSize(w, h)
    })
    resizeObserver.observe(mount)

    // No click has happened yet - park the pulse far in the past so its
    // age-based fade never shows one at the origin on load.
    gl.uniform3f(u.pulse, 0, 0, -1000)

    // Animation state. `visible` is driven by IntersectionObserver so the
    // rAF loop only runs while the mount is on screen (a second HeroField
    // sitting offscreen would otherwise burn the entire GPU budget for
    // nothing). Time is frozen while offscreen: t0 gets pushed forward by
    // however long we were paused, so the pattern resumes where it was
    // instead of jumping.
    let frame: number | null = null
    let visible = false
    let pausedAt = 0
    let lastDraw = 0
    const frameInterval = 1000 / Math.max(1, fpsCap)

    const drawFrame = (now: number) => {
      const t = (now - t0) / 1000
      if (!reduced) {
        mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * 0.05
        mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * 0.05
      }
      gl.uniform1f(u.time, t)
      const [mx, my] = toFieldSpace(mouseSmooth.x, mouseSmooth.y)
      gl.uniform2f(u.mouse, mx, my)

      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const tick = (now: number) => {
      if (now - lastDraw >= frameInterval) {
        // Snap to interval boundaries so we don't drift toward always-skip.
        lastDraw = now - ((now - lastDraw) % frameInterval)
        drawFrame(now)
      }
      if (!reduced && visible) frame = requestAnimationFrame(tick)
      else frame = null
    }

    const start = () => {
      if (frame !== null) return
      if (pausedAt !== 0) {
        // Freeze time across the pause instead of letting `t` jump.
        t0 += performance.now() - pausedAt
        pausedAt = 0
      }
      lastDraw = 0
      frame = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (frame === null) return
      cancelAnimationFrame(frame)
      frame = null
      pausedAt = performance.now()
    }

    // rootMargin gives a bit of pre-roll so scrolling toward the section
    // resumes the shader before it enters the viewport (avoids a visible
    // half-second of blank while the first frame renders).
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible = entry.isIntersecting
          if (visible) start()
          else stop()
        }
      },
      { rootMargin: '200px' },
    )
    intersectionObserver.observe(mount)

    // Draw one frame right away so the mount isn't blank on first paint
    // while IntersectionObserver's initial callback is still pending. If
    // the element turns out to be offscreen, the observer will stop us on
    // the very next tick anyway.
    drawFrame(performance.now())

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      if (canvas.parentNode === mount) mount.removeChild(canvas)
      gl.deleteProgram(program)
    }
  }, [dim, density, speed, weight, mouseAmt, glow, renderScale, fpsCap])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
    />
  )
}
