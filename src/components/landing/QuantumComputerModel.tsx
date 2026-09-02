import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, useGLTF } from '@react-three/drei'
import type { Group, Mesh, MeshStandardMaterial } from 'three'

import { cn } from '@/lib/utils'
import type { Motion } from './spin'
import { modelSpinSpeed } from './spin'

const MODEL_URL = '/models/quantum-computer.glb'
// Self-hosted so reflections don't depend on a third-party CDN (drei's
// `preset` pulls this from raw.githack.com, which lands after the model
// and leaves the metal looking flat until it arrives).
const ENV_URL = '/hdr/potsdamer_platz_1k.hdr'

// Framing, derived from the model's measured bounds (size 1.77 x 3.73 x 1.78,
// centre y -1.788). At scale 0.48 the model stands 1.79 units tall, and the
// camera distance below frames that to ~78% of the view height at fov 32 -
// previously it sat at z 7, filling only ~45% and reading as zoomed out.
const MODEL_SCALE = 0.48
const MODEL_CENTER_LIFT = 0.86
const CAMERA_Z = 4.1
const CAMERA_FOV = 32

type Finish = {
  metalness: number
  roughness: number
  envMapIntensity: number
}

// The source model ships most of the structure as `Black` at metalness 0 /
// roughness 1 - fully matte, which is why it read as opaque plastic. These
// overrides turn the housing and lattice into brushed/polished metal and
// push envMapIntensity up so the environment actually shows in the metals.
const FINISHES: Record<string, Finish> = {
  Black: { metalness: 0.95, roughness: 0.3, envMapIntensity: 1.5 },
  MedBlack: { metalness: 1, roughness: 0.22, envMapIntensity: 1.5 },
  Silver: { metalness: 1, roughness: 0.14, envMapIntensity: 1.9 },
  'Silver.001': { metalness: 1, roughness: 0.18, envMapIntensity: 1.7 },
  // Copper plates - keep a touch of roughness so they read as metal
  // rather than a noisy perfect mirror (source had roughness 0.02).
  material: { metalness: 1, roughness: 0.12, envMapIntensity: 1.8 },
  Orange: { metalness: 0.2, roughness: 0.45, envMapIntensity: 1 },
}
const DEFAULT_FINISH: Partial<Finish> = { envMapIntensity: 1.2 }

type ModelProps = {
  motion: Motion
}

function Model({ motion }: ModelProps) {
  const groupRef = useRef<Group>(null)
  const { scene } = useGLTF(MODEL_URL)

  useMemo(() => {
    scene.traverse((obj) => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]
      for (const raw of materials) {
        const mat = raw as MeshStandardMaterial
        if (!mat?.isMeshStandardMaterial) continue
        Object.assign(mat, FINISHES[mat.name] ?? DEFAULT_FINISH)
        mat.needsUpdate = true
      }
    })
  }, [scene])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * modelSpinSpeed(motion.move)
  })

  // Lifts the model's centre (measured at y -1.788 in model space, since
  // the assembly hangs below the origin) up to the camera's eye line.
  return (
    <group
      ref={groupRef}
      position={[0, MODEL_CENTER_LIFT, 0]}
      scale={MODEL_SCALE}
    >
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(MODEL_URL)

type Props = {
  className?: string
  motion: Motion
}

export function QuantumComputerModel({ className, motion }: Props) {
  return (
    <div className={cn('relative', className)}>
      <Canvas
        camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[3, 4, 4]}
          intensity={2.2}
          color="#b4ff39"
        />
        <directionalLight
          position={[-4, -1, -3]}
          intensity={0.7}
          color="#d12771"
        />
        <Suspense fallback={null}>
          <Model motion={motion} />
          <Environment files={ENV_URL} environmentIntensity={1} />
        </Suspense>
      </Canvas>
    </div>
  )
}
