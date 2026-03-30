import { useMemo } from 'react'
import { Line, Html } from '@react-three/drei'

const TOTAL_REVOLUTIONS = 13
const RADIUS = 150
const HEIGHT = 500

function HelixWireframe() {
  const points = useMemo(() => {
    const pts = []
    const segments = 800
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * TOTAL_REVOLUTIONS * Math.PI * 2
      pts.push([Math.cos(angle) * RADIUS, t * HEIGHT, Math.sin(angle) * RADIUS])
    }
    return pts
  }, [])

  return <Line points={points} color="#1D9E75" lineWidth={0.5} transparent opacity={0.08} />
}

const DEPTH_RINGS = [
  { y: 0, label: 'DEPTH 0', color: '#00d4aa' },
  { y: 80, label: 'DEPTH 2', color: '#7c6cf0' },
  { y: 200, label: 'DEPTH 5', color: '#ff6b35' },
  { y: 360, label: 'DEPTH 9', color: '#ffaa00' },
]

function DepthRing({ y, label, color }) {
  const points = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2
      pts.push([Math.cos(angle) * RADIUS, y, Math.sin(angle) * RADIUS])
    }
    return pts
  }, [y])

  return (
    <group>
      <Line points={points} color={color} lineWidth={0.3} transparent opacity={0.06} />
      {label && (
        <Html position={[RADIUS + 8, y, 0]} zIndexRange={[1, 0]} style={{
          color: `${color}50`, fontSize: '9px',
          fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {label}
        </Html>
      )}
    </group>
  )
}

export default function HelixGuide() {
  return (
    <group>
      <HelixWireframe />
      {DEPTH_RINGS.map((ring) => (
        <DepthRing key={ring.label} y={ring.y} label={ring.label} color={ring.color} />
      ))}
    </group>
  )
}
