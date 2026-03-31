import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Seeded random from event id for deterministic slides
function makeRand(str) {
  let seed = 0
  for (let i = 0; i < str.length; i++) {
    seed = ((seed << 5) - seed) + str.charCodeAt(i)
    seed |= 0
  }
  seed = Math.abs(seed)
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const TINTS = {
  deadEnd:     new THREE.Color('#e05555'),
  pivot:       new THREE.Color('#ddaa33'),
  convergence: new THREE.Color('#22bb88'),
}

function GlassSlide({ index, type, rotation, offsetZ, visible, progress }) {
  const meshRef = useRef()
  const tint = type === 'deadEnd' ? TINTS.deadEnd : type === 'pivot' ? TINTS.pivot : TINTS.convergence
  const tintOpacity = type === 'deadEnd' ? 0.08 : type === 'pivot' ? 0.1 : 0.12

  useFrame(() => {
    if (!meshRef.current) return
    const mat = meshRef.current.material
    const p = progress.current[index] || 0

    // Animate position: slides emerge from behind (z=0) to their target offset
    meshRef.current.position.z = -0.8 + offsetZ * p
    meshRef.current.position.y = -0.3 * index * p * 0.15
    meshRef.current.rotation.y = rotation * p
    meshRef.current.rotation.z = rotation * 0.3 * p

    // Fade in opacity
    mat.opacity = tintOpacity * p
    meshRef.current.visible = p > 0.01
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <planeGeometry args={[7, 4.2]} />
      <meshPhysicalMaterial
        color={tint}
        transparent
        opacity={0}
        transmission={0.9}
        thickness={0.1}
        roughness={0.05}
        clearcoat={1.0}
        clearcoatRoughness={0.02}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function GlassSlides({ event, position, isSelected }) {
  const groupRef = useRef()

  // Billboard: match camera orientation so slides stay behind the block face
  useFrame(({ camera }) => {
    if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion)
  })

  const slides = useMemo(() => {
    const rand = makeRand(event.id)
    const count = 8 + Math.floor(rand() * 8) // 8-15
    const result = []

    for (let i = 0; i < count; i++) {
      const r = rand()
      const type = r < 0.7 ? 'deadEnd' : r < 0.85 ? 'pivot' : 'convergence'
      const angleStep = (3 + rand() * 2) * (Math.PI / 180) // 3-5 degrees
      const rotation = angleStep * (i + 1) * (rand() > 0.5 ? 1 : -1)
      const offsetZ = -(0.15 + i * 0.12) // stack behind, each a bit further back

      result.push({ type, rotation, offsetZ, index: i })
    }
    return result
  }, [event.id])

  // Animation progress per slide (0..1), ref so useFrame can mutate
  const progress = useRef(slides.map(() => 0))
  const animating = useRef(true)
  const startTime = useRef(null)

  // Reset animation when component mounts (new selection)
  useEffect(() => {
    progress.current = slides.map(() => 0)
    animating.current = true
    startTime.current = null
  }, [event.id, slides])

  useFrame((_, delta) => {
    if (!animating.current) return
    if (startTime.current === null) startTime.current = 0

    startTime.current += delta
    const elapsed = startTime.current

    let allDone = true
    for (let i = 0; i < slides.length; i++) {
      const delay = i * 0.075 // 75ms stagger
      const slideElapsed = elapsed - delay
      if (slideElapsed <= 0) {
        allDone = false
        continue
      }
      const t = Math.min(slideElapsed / 0.4, 1) // 400ms ease-in per slide
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      progress.current[i] = eased
      if (t < 1) allDone = false
    }
    if (allDone) animating.current = false
  })

  return (
    <group ref={groupRef} position={position}>
      {slides.map((slide) => (
        <GlassSlide
          key={slide.index}
          index={slide.index}
          type={slide.type}
          rotation={slide.rotation}
          offsetZ={slide.offsetZ}
          visible={isSelected}
          progress={progress}
        />
      ))}
    </group>
  )
}
