import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Html } from '@react-three/drei'

export function getDepthColor(depth) {
  if (depth <= 1) return '#00d4aa'
  if (depth <= 4) return '#7c6cf0'
  if (depth <= 8) return '#ff6b35'
  return '#ffaa00'
}

export default function EventNode({ event, isSelected, isHovered, dimmed, onSelect, onHover }) {
  const groupRef = useRef()
  const depth = event.verificationDepth || 0
  const color = getDepthColor(depth)

  useFrame(({ camera }) => {
    if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion)
  })

  const handleClick = useCallback((e) => { e.stopPropagation(); onSelect(event) }, [event, onSelect])
  const handlePointerOver = useCallback((e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(event) }, [event, onHover])
  const handlePointerOut = useCallback(() => { document.body.style.cursor = 'default'; onHover(null) }, [onHover])

  let emissiveIntensity = 1.8
  let opacity = 0.92
  let wireOpacity = 0.25
  if (isSelected) {
    emissiveIntensity = 4.0
    opacity = 0.98
    wireOpacity = 0.6
  } else if (isHovered) {
    emissiveIntensity = 2.8
    opacity = 0.95
    wireOpacity = 0.4
  } else if (dimmed) {
    emissiveIntensity = 0.15
    opacity = 0.12
    wireOpacity = 0.02
  }

  return (
    <group ref={groupRef} position={event.position}>
      <RoundedBox
        args={[8, 5, 1.2]} radius={0.4} smoothness={4}
        onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color="#0c1020" emissive={color} emissiveIntensity={emissiveIntensity}
          roughness={0.1} metalness={0.3} transparent opacity={opacity}
        />
      </RoundedBox>

      <RoundedBox args={[8.1, 5.1, 1.25]} radius={0.4} smoothness={4}>
        <meshBasicMaterial color={color} wireframe transparent opacity={wireOpacity} />
      </RoundedBox>

      {/* Card face text — only rendered on selected/hovered for perf */}
      {(isSelected || isHovered) && (
        <Html position={[0, 0, 0.7]} transform distanceFactor={55}
          zIndexRange={[1, 0]}
          style={{ width: '130px', pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', lineHeight: 1.4, pointerEvents: 'none' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', textShadow: '0 1px 6px rgba(0,0,0,0.6)', marginBottom: '2px', letterSpacing: '0.5px' }}>
              {event.category.toUpperCase()}
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {event.agent || event.creator || 'unknown'}
            </div>
            <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.5)', textShadow: '0 1px 3px rgba(0,0,0,0.4)', marginTop: '1px' }}>
              D:{depth} · R:{event.revolution}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}
