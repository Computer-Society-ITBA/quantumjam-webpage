import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Props = {
  text: string
  className?: string
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uPixelRatio;

  attribute float aSeed;

  varying float vSeed;
  varying float vDisplacement;

  void main() {
    vec3 pos = position;

    // Idle drift so the cloud never fully rests.
    float phase = uTime * 0.6 + aSeed * 20.0;
    pos.x += sin(phase) * 2.5;
    pos.y += cos(phase * 0.8) * 2.5;

    // Radial repulsion from the pointer.
    vec2 diff = pos.xy - uMouse;
    float dist = length(diff) + 0.0001;
    float force = smoothstep(180.0, 0.0, dist) * uHover;
    pos.xy += (diff / dist) * force * 75.0;

    vDisplacement = force;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (mix(2.0, 3.5, aSeed) + force * 2.5) * uPixelRatio;
    vSeed = aSeed;
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  varying float vSeed;
  varying float vDisplacement;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d);
    vec3 col = mix(uColorA, uColorB, step(0.88, vSeed));
    col += vDisplacement * 0.35;
    gl_FragColor = vec4(col, alpha);
  }
`

type ParticleData = {
  positions: Float32Array
  seeds: Float32Array
}

function samplePixels(
  text: string,
  width: number,
  height: number,
): ParticleData {
  const canvas = document.createElement('canvas')
  const dpr = 2
  canvas.width = width * dpr
  canvas.height = height * dpr
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { positions: new Float32Array(), seeds: new Float32Array() }
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let fontSize = Math.min(width * 0.24, 360)
  const fontStack = "'IBM Plex Sans', ui-sans-serif, sans-serif"
  ctx.font = `700 ${fontSize}px ${fontStack}`
  while (fontSize > 32 && ctx.measureText(text).width > width * 0.9) {
    fontSize -= 6
    ctx.font = `700 ${fontSize}px ${fontStack}`
  }
  ctx.fillText(text, width / 2, height / 2)

  const stride = 3
  const image = ctx.getImageData(0, 0, width * dpr, height * dpr)
  const data = image.data
  const positions: number[] = []
  const seeds: number[] = []
  for (let y = 0; y < height * dpr; y += stride) {
    for (let x = 0; x < width * dpr; x += stride) {
      const alpha = data[(y * width * dpr + x) * 4 + 3]
      if (alpha > 128) {
        const wx = x / dpr - width / 2
        const wy = -(y / dpr - height / 2)
        positions.push(wx + (Math.random() - 0.5) * 1.5, wy, 0)
        seeds.push(Math.random())
      }
    }
  }
  return {
    positions: new Float32Array(positions),
    seeds: new Float32Array(seeds),
  }
}

type SceneHandles = {
  resize: (w: number, h: number) => void
  dispose: () => void
}

function buildScene(
  mount: HTMLDivElement,
  text: string,
  initialWidth: number,
  initialHeight: number,
  dpr: number,
  reduced: boolean,
): SceneHandles {
  let width = initialWidth
  let height = initialHeight

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    0.1,
    10,
  )
  camera.position.z = 1

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height, false)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'
  mount.appendChild(renderer.domElement)

  const build = (w: number, h: number) => {
    const sampled = samplePixels(text, w, h)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(sampled.positions, 3),
    )
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(sampled.seeds, 1))
    return geometry
  }

  let geometry = build(width, height)

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(-9999, -9999) },
      uHover: { value: 0 },
      uPixelRatio: { value: dpr },
      uColorA: { value: new THREE.Color('#f0c988') },
      uColorB: { value: new THREE.Color('#7ec4dd') },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  })

  const points = new THREE.Points(geometry, material)
  scene.add(points)

  const pointer = { x: -9999, y: -9999, active: false }
  const onMove = (e: PointerEvent) => {
    const rect = mount.getBoundingClientRect()
    pointer.x = e.clientX - rect.left - width / 2
    pointer.y = -(e.clientY - rect.top - height / 2)
    pointer.active = true
  }
  const onLeave = () => {
    pointer.active = false
  }
  mount.addEventListener('pointermove', onMove)
  mount.addEventListener('pointerleave', onLeave)

  let frame = 0
  const t0 = performance.now()
  const tick = () => {
    const t = (performance.now() - t0) / 1000
    material.uniforms.uTime.value = t
    material.uniforms.uMouse.value.x +=
      (pointer.x - material.uniforms.uMouse.value.x) * 0.18
    material.uniforms.uMouse.value.y +=
      (pointer.y - material.uniforms.uMouse.value.y) * 0.18
    const target = pointer.active ? 1 : 0
    material.uniforms.uHover.value +=
      (target - material.uniforms.uHover.value) * 0.08
    renderer.render(scene, camera)
    if (!reduced) frame = requestAnimationFrame(tick)
  }
  tick()

  const resize = (w: number, h: number) => {
    width = w
    height = h
    renderer.setSize(width, height, false)
    camera.left = -width / 2
    camera.right = width / 2
    camera.top = height / 2
    camera.bottom = -height / 2
    camera.updateProjectionMatrix()

    points.geometry.dispose()
    geometry = build(width, height)
    points.geometry = geometry
  }

  const dispose = () => {
    cancelAnimationFrame(frame)
    mount.removeEventListener('pointermove', onMove)
    mount.removeEventListener('pointerleave', onLeave)
    if (renderer.domElement.parentNode === mount) {
      mount.removeChild(renderer.domElement)
    }
    points.geometry.dispose()
    material.dispose()
    renderer.dispose()
  }

  return { resize, dispose }
}

export function ParticleTitle({ text, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const dpr = Math.min(window.devicePixelRatio, 2)

    let handles: SceneHandles | null = null
    let currentWidth = 0
    let currentHeight = 0

    const handleSize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0) return
      if (handles === null) {
        handles = buildScene(mount, text, w, h, dpr, reduced)
        currentWidth = w
        currentHeight = h
        return
      }
      if (w === currentWidth && h === currentHeight) return
      currentWidth = w
      currentHeight = h
      handles.resize(w, h)
    }

    handleSize()
    const observer = new ResizeObserver(handleSize)
    observer.observe(mount)

    return () => {
      observer.disconnect()
      handles?.dispose()
    }
  }, [text])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={className}
      style={{ touchAction: 'none' }}
    />
  )
}
