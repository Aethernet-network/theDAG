import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

// Duration scales with chain length: each segment gets ~200ms
function getTraceDuration(chainLength) {
  return Math.max(chainLength * 200, 800)
}

export { getTraceDuration }

export default function TraceLine({ chain }) {
  const progressRef = useRef(0)

  // Reset progress when chain changes
  const chainKey = useRef(null)
  const key = chain.map((e) => e.id).join(',')
  if (chainKey.current !== key) {
    chainKey.current = key
    progressRef.current = 0
  }

  const duration = getTraceDuration(chain.length) / 1000 // in seconds

  const segments = useMemo(() => {
    const segs = []
    for (let i = 0; i < chain.length - 1; i++) {
      const start = chain[i].position
      const end = chain[i + 1].position
      const mid = [
        (start[0] + end[0]) / 2 * 1.12,
        (start[1] + end[1]) / 2 + 4,
        (start[2] + end[2]) / 2 * 1.12,
      ]
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...start), new THREE.Vector3(...mid), new THREE.Vector3(...end),
      )
      segs.push({ points: curve.getPoints(16).map((p) => [p.x, p.y, p.z]), index: i })
    }
    return segs
  }, [chain])

  useFrame((_, delta) => {
    progressRef.current = Math.min(progressRef.current + delta / duration, 1)
  })

  return (
    <group>
      {segments.map((seg) => {
        const segProgress = progressRef.current * segments.length
        const segActive = seg.index < segProgress
        const segLeading = seg.index < segProgress && seg.index >= segProgress - 1

        return (
          <group key={seg.index}>
            <Line points={seg.points}
              color={segLeading ? '#ffffff' : '#00d4aa'}
              lineWidth={segActive ? 4 : 0.3}
              transparent opacity={segActive ? 0.6 : 0.02}
            />
            {segActive && (
              <Line points={seg.points}
                color="#ffffff"
                lineWidth={segLeading ? 2 : 1}
                transparent opacity={segLeading ? 0.95 : 0.4}
              />
            )}
          </group>
        )
      })}

      {chain.map((evt, i) => {
        const lit = i <= progressRef.current * chain.length
        const isEnd = i === 0 || i === chain.length - 1
        return (
          <mesh key={i} position={evt.position}>
            <sphereGeometry args={[lit ? (isEnd ? 2.0 : 1.0) : 0.2, 12, 12]} />
            <meshStandardMaterial
              color={lit ? '#ffffff' : '#0c1020'}
              emissive={lit ? '#00ffcc' : '#00d4aa'}
              emissiveIntensity={lit ? (isEnd ? 8 : 5) : 0.3}
              roughness={0} metalness={1}
              transparent opacity={lit ? 0.95 : 0.1}
            />
          </mesh>
        )
      })}
    </group>
  )
}
