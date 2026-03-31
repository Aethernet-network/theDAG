import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
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

// Generate a fake trajectory hash
function makeHash(seed, len = 12) {
  const chars = '0123456789abcdef'
  const r = makeRand(seed)
  let h = ''
  for (let i = 0; i < len; i++) h += chars[Math.floor(r() * 16)]
  return h
}

const TYPE_CONFIG = {
  deadEnd:     { color: '#e05555', emissive: '#ff3333', label: 'DEAD END',     opacity: 0.25 },
  pivot:       { color: '#ddaa33', emissive: '#ffcc00', label: 'PIVOT',        opacity: 0.28 },
  convergence: { color: '#22bb88', emissive: '#00ff88', label: 'CONVERGENCE',  opacity: 0.30 },
}

// Each slide stacks straight down below the block in a clean vertical line
function GlassSlide({ index, total, type, restY, progress, eventId, onSlideHover }) {
  const meshRef = useRef()
  const cfg = TYPE_CONFIG[type]
  const [hovered, setHovered] = useState(false)
  const hoverProgress = useRef(0)
  const hash = useMemo(() => makeHash(`${eventId}-slide-${index}`), [eventId, index])
  const timestamp = useMemo(() => {
    const r = makeRand(`${eventId}-ts-${index}`)
    const d = new Date(Date.now() - Math.floor(r() * 86400000 * 30))
    return d.toISOString().slice(0, 19).replace('T', ' ')
  }, [eventId, index])

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
    setHovered(true)
    onSlideHover(index)
  }, [index, onSlideHover])

  const handlePointerOut = useCallback((e) => {
    e.stopPropagation()
    document.body.style.cursor = 'default'
    setHovered(false)
    onSlideHover(-1)
  }, [onSlideHover])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const p = progress.current[index] || 0

    // Hover animation: slide pops out to the right
    const hoverTarget = hovered ? 1 : 0
    hoverProgress.current += (hoverTarget - hoverProgress.current) * Math.min(delta * 10, 1)
    const hp = hoverProgress.current

    // Stack straight down, pop right on hover
    meshRef.current.position.set(hp * 5, restY * p, -0.5)
    meshRef.current.rotation.z = 0

    const mat = meshRef.current.material
    mat.opacity = (cfg.opacity + hp * 0.3) * p
    mat.emissiveIntensity = (0.4 + hp * 1.5) * p

    meshRef.current.visible = p > 0.01
  })

  return (
    <group>
      <mesh
        ref={meshRef}
        visible={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[6.5, 0.6, 0.06]} />
        <meshStandardMaterial
          color={cfg.color}
          emissive={cfg.emissive}
          emissiveIntensity={0.4}
          transparent
          opacity={0}
          roughness={0.15}
          metalness={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Trajectory data overlay — shown on hover */}
      {hovered && (
        <Html
          position={[8, restY, 0]}
          transform
          distanceFactor={45}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none', width: '160px' }}
        >
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(8, 10, 18, 0.92)',
            border: `1px solid ${cfg.color}`,
            borderRadius: '4px',
            padding: '6px 8px',
            lineHeight: 1.5,
          }}>
            <div style={{ fontSize: '8px', fontWeight: 700, color: cfg.color, letterSpacing: '1px', marginBottom: '2px' }}>
              {cfg.label}
            </div>
            <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.6)' }}>
              {timestamp}
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.85)', marginTop: '3px', wordBreak: 'break-all' }}>
              0x{hash}
            </div>
            <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              attempt {index + 1}/{total}
            </div>
          </div>
        </Html>
      )}
    </group>
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

    // Stack below the block: start just under the block bottom edge (-2.5 for half-height)
    // and step down uniformly so they form a clean vertical list
    const startY = -3.2
    const stepY = 0.75

    for (let i = 0; i < count; i++) {
      const r = rand()
      const type = r < 0.7 ? 'deadEnd' : r < 0.85 ? 'pivot' : 'convergence'
      const restY = startY - i * stepY

      result.push({ type, restY, index: i, count })
    }
    return result
  }, [event.id])

  const [hoveredSlide, setHoveredSlide] = useState(-1)
  const handleSlideHover = useCallback((idx) => setHoveredSlide(idx), [])

  // Animation progress per slide (0..1)
  const progress = useRef(slides.map(() => 0))
  const animating = useRef(true)
  const startTime = useRef(null)

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
      const delay = i * 0.08 // 80ms stagger
      const slideElapsed = elapsed - delay
      if (slideElapsed <= 0) {
        allDone = false
        continue
      }
      const t = Math.min(slideElapsed / 0.35, 1) // 350ms per slide
      const eased = 1 - Math.pow(1 - t, 3)       // ease-out cubic
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
          total={slide.count}
          type={slide.type}
          restY={slide.restY}
          progress={progress}
          eventId={event.id}
          onSlideHover={handleSlideHover}
        />
      ))}
    </group>
  )
}
