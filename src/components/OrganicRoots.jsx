import { useMemo } from 'react'
import { Line } from '@react-three/drei'

// Seeded random from event id for deterministic roots
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

export default function OrganicRoots({ event, position, isSelected }) {
  const roots = useMemo(() => {
    const rand = makeRand(event.id)
    const rootCount = 8 + Math.floor(rand() * 8) // 8-15 roots
    const result = []

    for (let i = 0; i < rootCount; i++) {
      const spreadAngle = (i / rootCount) * Math.PI * 2
      const isDeadEnd = rand() < 0.7
      const isPivot = !isDeadEnd && rand() < 0.5

      const length = isDeadEnd
        ? 4 + rand() * 6
        : isPivot
          ? 8 + rand() * 6
          : 12 + rand() * 8

      const segments = 15
      const points = []
      let x = 0, y = 0, z = 0

      for (let s = 0; s <= segments; s++) {
        const t = s / segments
        x += Math.sin(spreadAngle + t * 2 + i) * (length / segments) * 0.6
        y -= (length / segments) * (0.5 + t * 0.5)
        z += Math.cos(spreadAngle + t * 2 + i) * (length / segments) * 0.4
        x += Math.sin(t * 8 + i * 3) * 0.3 * t
        z += Math.cos(t * 6 + i * 5) * 0.2 * t
        points.push([x, y, z])
      }

      // Sub-branches for non-dead-ends
      const subBranches = []
      const subCount = isDeadEnd ? 0 : 1 + Math.floor(rand() * 2)
      for (let sb = 0; sb < subCount; sb++) {
        const splitIdx = Math.floor(segments * (0.4 + rand() * 0.3))
        const subPoints = []
        let sx = points[splitIdx][0]
        let sy = points[splitIdx][1]
        let sz = points[splitIdx][2]
        for (let ss = 0; ss < 8; ss++) {
          const st = ss / 8
          sx += Math.sin(spreadAngle + sb * 3 + st * 4) * 0.8
          sy -= 0.5 + st * 0.3
          sz += Math.cos(spreadAngle + sb * 2 + st * 3) * 0.6
          subPoints.push([sx, sy, sz])
        }
        subBranches.push(subPoints)
      }

      const color = isDeadEnd ? '#e05555' : isPivot ? '#ddaa33' : '#22bb88'
      const baseOpacity = isDeadEnd ? 0.12 : isPivot ? 0.18 : 0.25
      const lineWidth = isDeadEnd ? 0.6 : isPivot ? 0.8 : 1.2

      result.push({ points, subBranches, color, baseOpacity, lineWidth })
    }
    return result
  }, [event.id])

  // Brighten on selection
  const opacityMul = isSelected ? 3 : 1

  return (
    <group position={position}>
      {roots.map((root, i) => (
        <group key={i}>
          <Line
            points={root.points}
            color={root.color}
            lineWidth={root.lineWidth}
            transparent
            opacity={Math.min(root.baseOpacity * opacityMul, 0.8)}
          />
          <mesh position={root.points[root.points.length - 1]}>
            <sphereGeometry args={[0.15, 6, 6]} />
            <meshBasicMaterial
              color={root.color}
              transparent
              opacity={Math.min(root.baseOpacity * 1.5 * opacityMul, 0.9)}
            />
          </mesh>
          {root.subBranches.map((subPts, si) => (
            <Line
              key={si}
              points={subPts}
              color={root.color}
              lineWidth={root.lineWidth * 0.6}
              transparent
              opacity={Math.min(root.baseOpacity * 0.7 * opacityMul, 0.7)}
            />
          ))}
        </group>
      ))}
    </group>
  )
}
