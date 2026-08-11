import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

// Kaleidoscopic fractal loop by kishimisu (Shadertoy mtyGWy),
// adapted to the QuantumJam palette: cosine oscillation constrained
// to the gold <-> blue axis via a negative-b component on the blue
// channel — no violet, red, or orange ever gets produced.
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uDim;

  varying vec2 vUv;

  vec3 palette(float t) {
    vec3 a = vec3(0.72, 0.78, 0.70);
    vec3 b = vec3(0.22, 0.01, -0.17);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.0, 0.0);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 fragCoord = vUv * uResolution;
    vec2 uv = (fragCoord * 2.0 - uResolution) / uResolution.y;

    // Shift the fractal content up by ~10% of the visible height while
    // the feather stays anchored to the actual canvas bottom (uses vUv).
    uv.y -= 0.2;

    vec2 m = uMouse / uResolution;
    vec2 mCentered = m - 0.5;
    float ang = mCentered.x * 1.6;
    float s = sin(ang);
    float c = cos(ang);
    uv = mat2(c, -s, s, c) * uv;

    vec2 uv0 = uv;
    float scale = 1.1 + m.x * 1.1;
    float tone = 0.45 + m.y * 0.9;

    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
      uv = fract(uv * scale) - 0.5;

      float d = length(uv) * exp(-length(uv0));

      vec3 col = palette(length(uv0) + i * 0.4 + uTime * 0.35);

      d = sin(d * 8.0 + uTime) / 8.0;
      d = abs(d);
      d = pow(0.01 / d, 1.2);

      finalColor += col * d;
    }

    finalColor *= tone * uDim;

    float r = length(uv0);
    finalColor *= smoothstep(0.0, 1.8, r * 0.5 + 0.35);

    // Feather the bottom edge so the shader dissolves into the section
    // base colour where it meets the interference divider below.
    float feather = smoothstep(0.05, 0.75, vUv.y);
    gl_FragColor = vec4(finalColor * feather, feather);
  }
`

export function ShaderBackground({ className }: Props) {
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
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    mount.appendChild(renderer.domElement)

    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uMouse: { value: new THREE.Vector2(width / 2, height / 2) },
      uDim: { value: 0.12 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    scene.add(mesh)

    const targetMouse = new THREE.Vector2(width / 2, height / 2)
    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      targetMouse.set(
        e.clientX - rect.left,
        rect.height - (e.clientY - rect.top),
      )
    }
    // Listen on window so the field reacts to the cursor even when it's
    // hovering the content on top of the canvas (which is pointer-events
    // none itself).
    window.addEventListener('pointermove', onMove, { passive: true })

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
      uniforms.uTime.value = t
      uniforms.uMouse.value.x +=
        (targetMouse.x - uniforms.uMouse.value.x) * 0.18
      uniforms.uMouse.value.y +=
        (targetMouse.y - uniforms.uMouse.value.y) * 0.18
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
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0', className)}
    />
  )
}
