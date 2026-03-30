import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const _dummy = new THREE.Object3D()
const _color = new THREE.Color()

// Single InstancedMesh for ALL connection particles — one useFrame for all
export default function ElectricalParticles({ connections, getColor }) {
  const meshRef = useRef()
  const count = connections.length

  // Pre-compute curves and random start offsets
  const { curves, offsets } = useMemo(() => {
    const curves = []
    const offsets = []
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i]
      const s = new THREE.Vector3(...conn.parent.position)
      const e = new THREE.Vector3(...conn.child.position)
      const mid = new THREE.Vector3(
        (s.x + e.x) / 2 * 1.12,
        (s.y + e.y) / 2 + 4,
        (s.z + e.z) / 2 * 1.12,
      )
      curves.push(new THREE.QuadraticBezierCurve3(s, mid, e))
      offsets.push(Math.random())
    }
    return { curves, offsets }
  }, [connections])

  // Set instance colors once
  useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < connections.length; i++) {
      const color = getColor(connections[i].child.verificationDepth)
      _color.set(color)
      meshRef.current.setColorAt(i, _color)
    }
    meshRef.current.instanceColor.needsUpdate = true
  }, [connections, getColor])

  // Single useFrame updates all particle positions
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const time = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const t = (time * 0.08 + offsets[i]) % 1
      const point = curves[i].getPoint(t)
      _dummy.position.copy(point)
      _dummy.scale.setScalar(0.3 + Math.sin(t * Math.PI) * 0.15)
      _dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, _dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#7c6cf0"
        emissiveIntensity={3}
        roughness={0}
        metalness={1}
      />
    </instancedMesh>
  )
}
