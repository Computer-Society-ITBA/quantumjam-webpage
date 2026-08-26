import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
  /** Lower intensity for use as a smaller decorative texture. */
  dim?: boolean
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

// Two circular wave sources, summed (not layered) at every pixel, then
// re-drawn as thin contour lines of that combined field rather than a
// shaded/filled heatmap: color stays a sharp line here, never a diffuse
// glow. Because the lines trace the sum rather than each source
// independently, they visibly bend and merge into each other wherever the
// two waves interact. This needs a true per-pixel sample (a coarse CPU grid
// aliases badly since the sum can swing through several contour levels
// within one grid cell), which is exactly what a fragment shader is for.
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uSource1;
  uniform vec2 uSource2;
  uniform float uAlphaScale;

  varying vec2 vUv;

  // Fringe count is governed by (distance between sources) / WAVELENGTH, not
  // by this constant alone. A short wavelength here reads as a dense field
  // of tiny repeating lobes instead of a handful of large, legible arcs.
  const float WAVELENGTH = 110.0;
  const float FREQUENCY = 0.32;
  const float LEVEL_STEP = 0.55;
  const float LINE_HALF_WIDTH = 0.075;

  void main() {
    vec2 p = vUv * uResolution;
    float r1 = distance(p, uSource1);
    float r2 = distance(p, uSource2);
    float phase = uTime * FREQUENCY;
    float amp = sin(6.283185307 * (r1 / WAVELENGTH - phase))
              + sin(6.283185307 * (r2 / WAVELENGTH - phase));

    float level = amp / LEVEL_STEP;
    float d = abs(level - floor(level + 0.5)) * LEVEL_STEP;
    float lineMask = 1.0 - smoothstep(LINE_HALF_WIDTH * 0.5, LINE_HALF_WIDTH, d);

    vec3 green = vec3(180.0, 255.0, 57.0) / 255.0;
    vec3 magenta = vec3(255.0, 95.0, 168.0) / 255.0;
    vec3 base = amp >= 0.0 ? green : magenta;
    // The outermost levels (strongest constructive alignment) collapse
    // toward white, echoing the brand's "white is the measured, aligned
    // state" rule.
    float peak = clamp((abs(amp) - 1.5) / 0.5, 0.0, 1.0);
    vec3 color = mix(base, vec3(1.0), peak);

    // Feather toward the edges so the field settles into the surrounding
    // section instead of ending on a hard rectangle.
    vec2 c = vUv - vec2(0.5, 0.58);
    float edge = 1.0 - smoothstep(0.35, 0.62, length(c));

    gl_FragColor = vec4(color, lineMask * uAlphaScale * edge);
  }
`

type Anchor = {
  x: number
  y: number
  driftX: number
  driftY: number
  driftRate: number
  /** How strongly this source's position chases the cursor, 0-1. */
  pull: number
}

export function InterferenceField({ className, dim = false }: Props) {
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

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(width, height, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    mount.appendChild(renderer.domElement)

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uSource1: { value: new THREE.Vector2(width * 0.36, height * 0.58) },
      uSource2: { value: new THREE.Vector2(width * 0.66, height * 0.44) },
      uAlphaScale: { value: dim ? 0.6 : 1 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    scene.add(mesh)

    // Target is set from real pointer events; the drawn position chases it
    // with exponential smoothing each frame (see `tick`), so the field's
    // response to the cursor is a genuine interpolation, not a snap. Tracked
    // in DOM space (0,0 = top-left) since that's what pointer events give;
    // flipped to GL space (0,0 = bottom-left) only when writing the uniform.
    const mouseTarget = { x: 0.5, y: 0.5 }
    const mouseSmooth = { x: 0.5, y: 0.5 }

    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      mouseTarget.x = (e.clientX - rect.left) / rect.width
      mouseTarget.y = (e.clientY - rect.top) / rect.height
    }
    // Listen on window so the field reacts to the cursor even when it's
    // hovering the content on top of it (the mount is pointer-events-none).
    window.addEventListener('pointermove', onMove, { passive: true })

    const anchors: [Anchor, Anchor] = [
      {
        x: 0.36,
        y: 0.42,
        driftX: 0.03,
        driftY: 0.025,
        driftRate: 0.045,
        pull: 0.55,
      },
      {
        x: 0.66,
        y: 0.56,
        driftX: 0.035,
        driftY: 0.03,
        driftRate: 0.03,
        pull: 0.16,
      },
    ]
    const sourceUniforms = [uniforms.uSource1, uniforms.uSource2] as const

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0 || (w === width && h === height)) return
      width = w
      height = h
      renderer.setSize(width, height, false)
      uniforms.uResolution.value.set(width, height)
    })
    resizeObserver.observe(mount)

    let frame = 0
    const t0 = performance.now()
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      if (!reduced) {
        mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * 0.05
        mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * 0.05
      }
      uniforms.uTime.value = t

      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i]
        const driftX = a.x + a.driftX * Math.sin(t * a.driftRate * Math.PI * 2)
        const driftY =
          a.y + a.driftY * Math.cos(t * a.driftRate * Math.PI * 1.7)
        const px = (driftX + (mouseSmooth.x - driftX) * a.pull) * width
        const pyDom = (driftY + (mouseSmooth.y - driftY) * a.pull) * height
        sourceUniforms[i].value.set(px, height - pyDom)
      }

      renderer.render(scene, camera)
      if (!reduced) frame = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onMove)
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
      mesh.geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [dim])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
    />
  )
}
