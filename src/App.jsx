import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import MetabolicDisc from './components/MetabolicDisc'
import HelixGuide from './components/HelixGuide'
import SearchPanel from './components/SearchPanel'
import VitalsPanel from './components/VitalsPanel'
import Legend from './components/Legend'
import DetailPanel from './components/DetailPanel'
import TraceResultPanel from './components/TraceResultPanel'
import { useExplorerStore } from './stores/explorerStore'
import { getTraceDuration } from './components/TraceLine'

// ── Easing ─────────────────────────────────────────────────────────

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }
function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2 }
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }
function easeInCubic(t) { return t * t * t }

// ── Camera Rig ─────────────────────────────────────────────────────
// ALL navigation: zoomout → rotate → elevate → pushin
// Trace:          trace_zoomout → trace_light → rotate → elevate → pushin

function CameraRig() {
  const controlsRef = useRef()
  const selectedEvent = useExplorerStore((s) => s.selectedEvent)
  const navSource = useExplorerStore((s) => s.navSource)
  const isTracing = useExplorerStore((s) => s.isTracing)
  const traceChain = useExplorerStore((s) => s.traceChain)
  const finishTrace = useExplorerStore((s) => s.finishTrace)
  const { camera } = useThree()
  const [userInteracted, setUserInteracted] = useState(false)
  const timeoutRef = useRef(null)

  const phaseRef = useRef(null)
  const phaseStartRef = useRef(0)
  const startPosRef = useRef(new THREE.Vector3())
  const startTargetRef = useRef(new THREE.Vector3(0, 250, 0))
  const prevSelectedId = useRef(null)
  const traceTargetRef = useRef(new THREE.Vector3())

  const handleStart = useCallback(() => {
    if (phaseRef.current) phaseRef.current = null
    setUserInteracted(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  const handleEnd = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setUserInteracted(false), 10000)
  }, [])

  // ── Normal navigation — ALWAYS full zoomout first ──
  useEffect(() => {
    if (!selectedEvent) { prevSelectedId.current = null; return }
    if (selectedEvent.id === prevSelectedId.current) return
    if (phaseRef.current && phaseRef.current.startsWith('trace')) return

    prevSelectedId.current = selectedEvent.id
    startPosRef.current.copy(camera.position)
    if (controlsRef.current) startTargetRef.current.copy(controlsRef.current.target)
    // Direct 3D click: rotate from current orbit → elevate → pushin (no zoomout)
    // Panel/search click: full zoomout → rotate → elevate → pushin
    phaseRef.current = navSource === 'panel' ? 'zoomout' : 'rotate'
    phaseStartRef.current = performance.now()
  }, [selectedEvent, camera, navSource])

  // ── Trace genesis ──
  useEffect(() => {
    if (!isTracing || traceChain.length < 2) return
    const genesis = traceChain[traceChain.length - 1]
    traceTargetRef.current.set(...genesis.position)
    startPosRef.current.copy(camera.position)
    if (controlsRef.current) startTargetRef.current.copy(controlsRef.current.target)
    phaseRef.current = 'trace_zoomout'
    phaseStartRef.current = performance.now()
  }, [isTracing, traceChain, camera])

  useFrame(() => {
    if (!controlsRef.current) return
    const phase = phaseRef.current

    if (!phase) { controlsRef.current.enabled = true; return }
    controlsRef.current.enabled = false

    const elapsed = performance.now() - phaseStartRef.current
    const isTracePhase = phase.startsWith('trace') || (isTracing && ['rotate', 'elevate', 'pushin'].includes(phase))
    const targetVec = isTracePhase
      ? traceTargetRef.current.clone()
      : selectedEvent ? new THREE.Vector3(...selectedEvent.position) : new THREE.Vector3(0, 250, 0)

    switch (phase) {
      // ── TRACE: zoom fully out ──
      case 'trace_zoomout': {
        const duration = 800
        const t = Math.min(elapsed / duration, 1)
        const eased = easeOutCubic(t)
        const widePos = new THREE.Vector3(450, 400, 450)
        const helixCenter = new THREE.Vector3(0, 250, 0)
        camera.position.lerpVectors(startPosRef.current, widePos, eased)
        controlsRef.current.target.lerpVectors(startTargetRef.current, helixCenter, eased)
        camera.lookAt(controlsRef.current.target)
        if (t >= 1) {
          startPosRef.current.copy(camera.position)
          startTargetRef.current.copy(controlsRef.current.target)
          phaseRef.current = 'trace_light'
          phaseStartRef.current = performance.now()
        }
        break
      }

      // ── TRACE: hold wide while light races through chain ──
      case 'trace_light': {
        const duration = getTraceDuration(traceChain.length) + 300
        const t = Math.min(elapsed / duration, 1)
        camera.lookAt(controlsRef.current.target)
        if (t >= 1) {
          startPosRef.current.copy(camera.position)
          startTargetRef.current.copy(controlsRef.current.target)
          phaseRef.current = 'rotate'
          phaseStartRef.current = performance.now()
        }
        break
      }

      // ── NORMAL: zoom out from current box, keeping it centered ──
      case 'zoomout': {
        const duration = 700
        const t = Math.min(elapsed / duration, 1)
        const eased = easeOutCubic(t)
        // Pull outward from helix center through the current orbit target
        const currentTarget = startTargetRef.current
        const outDir = new THREE.Vector3(currentTarget.x, 0, currentTarget.z).normalize()
        // Wide position: far out along that direction, elevated
        const widePos = new THREE.Vector3(
          outDir.x * 450,
          400,
          outDir.z * 450,
        )
        camera.position.lerpVectors(startPosRef.current, widePos, eased)
        // Keep looking at the current box initially, then shift to helix center
        const helixCenter = new THREE.Vector3(0, 250, 0)
        controlsRef.current.target.lerpVectors(startTargetRef.current, helixCenter, eased)
        camera.lookAt(controlsRef.current.target)
        if (t >= 1) {
          startPosRef.current.copy(camera.position)
          startTargetRef.current.copy(controlsRef.current.target)
          phaseRef.current = 'rotate'
          phaseStartRef.current = performance.now()
        }
        break
      }

      // ── Rotate to face target ──
      case 'rotate': {
        const duration = 600
        const t = Math.min(elapsed / duration, 1)
        const eased = easeInOutSine(t)
        const targetAngle = Math.atan2(targetVec.z, targetVec.x)
        const startAngle = Math.atan2(startPosRef.current.z, startPosRef.current.x)
        const dist = Math.sqrt(startPosRef.current.x ** 2 + startPosRef.current.z ** 2)
        let delta = targetAngle - startAngle
        if (delta > Math.PI) delta -= Math.PI * 2
        if (delta < -Math.PI) delta += Math.PI * 2
        const newAngle = startAngle + delta * eased
        camera.position.x = Math.cos(newAngle) * dist
        camera.position.z = Math.sin(newAngle) * dist
        camera.position.y = startPosRef.current.y
        controlsRef.current.target.lerpVectors(startTargetRef.current, targetVec, eased)
        camera.lookAt(controlsRef.current.target)
        if (t >= 1) {
          startPosRef.current.copy(camera.position)
          startTargetRef.current.copy(controlsRef.current.target)
          phaseRef.current = 'elevate'
          phaseStartRef.current = performance.now()
        }
        break
      }

      // ── Adjust height ──
      case 'elevate': {
        const duration = 500
        const t = Math.min(elapsed / duration, 1)
        const eased = easeInOutQuad(t)
        camera.position.y = startPosRef.current.y + (targetVec.y + 30 - startPosRef.current.y) * eased
        controlsRef.current.target.lerpVectors(startTargetRef.current, targetVec, eased)
        camera.lookAt(controlsRef.current.target)
        if (t >= 1) {
          startPosRef.current.copy(camera.position)
          startTargetRef.current.copy(controlsRef.current.target)
          phaseRef.current = 'pushin'
          phaseStartRef.current = performance.now()
        }
        break
      }

      // ── Push in to reading distance ──
      case 'pushin': {
        const duration = 600
        const t = Math.min(elapsed / duration, 1)
        const eased = easeInCubic(t)
        const outward = new THREE.Vector2(targetVec.x, targetVec.z).normalize()
        const finalPos = targetVec.clone().add(new THREE.Vector3(outward.x * 35, 20, outward.y * 35))
        camera.position.lerpVectors(startPosRef.current, finalPos, eased)
        controlsRef.current.target.lerpVectors(startTargetRef.current, targetVec, eased)
        camera.lookAt(controlsRef.current.target)
        if (t >= 1) {
          phaseRef.current = null
          controlsRef.current.enabled = true
          if (isTracing) {
            prevSelectedId.current = traceChain[traceChain.length - 1]?.id || null
            finishTrace()
          }
        }
        break
      }
    }
  })

  // Keep camera locked on selected block
  useFrame(() => {
    if (controlsRef.current && selectedEvent && !phaseRef.current) {
      const targetVec = new THREE.Vector3(...selectedEvent.position)
      if (controlsRef.current.target.distanceTo(targetVec) > 0.5) {
        controlsRef.current.target.lerp(targetVec, 0.05)
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 250, 0]}
      enableDamping dampingFactor={0.05}
      minDistance={30} maxDistance={1200}
      autoRotate={!selectedEvent && !userInteracted && !phaseRef.current}
      autoRotateSpeed={0.3}
      onStart={handleStart} onEnd={handleEnd}
    />
  )
}

function DeselectPlane() {
  const setSelectedEvent = useExplorerStore((s) => s.setSelectedEvent)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]} onClick={() => setSelectedEvent(null)} visible={false}>
      <planeGeometry args={[2000, 2000]} />
    </mesh>
  )
}

function LiveSimulation() {
  const isLive = useExplorerStore((s) => s.isLive)
  const addEvent = useExplorerStore((s) => s.addEvent)
  const selectedEvent = useExplorerStore((s) => s.selectedEvent)
  useEffect(() => {
    // Pause simulation while zoomed into a block
    if (!isLive || selectedEvent) return
    const interval = setInterval(addEvent, 4000)
    return () => clearInterval(interval)
  }, [isLive, addEvent, selectedEvent])
  return null
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#080a12']} />
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 200, 0]} intensity={0.4} color="#7c6cf0" />
      <directionalLight position={[100, 200, 100]} intensity={0.3} color="#ffffff" />
      <Stars radius={800} depth={100} count={3000} factor={3} fade speed={0.5} />
      <Grid
        position={[0, -5, 0]} args={[800, 800]}
        cellSize={10} cellThickness={0.5} cellColor="#1a1e2e"
        sectionSize={50} sectionThickness={1} sectionColor="#252a3a"
        fadeDistance={600} fadeStrength={1.5} infiniteGrid
      />
      <DeselectPlane />
      <HelixGuide />
      <MetabolicDisc />
      <LiveSimulation />
      <CameraRig />
      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} radius={0.8} />
        <Vignette darkness={0.4} offset={0.3} />
      </EffectComposer>
    </>
  )
}

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#080a12' }}>
      <Canvas
        camera={{ position: [400, 350, 400], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        <Scene />
      </Canvas>
      <SearchPanel />
      <DetailPanel />
      <TraceResultPanel />
      <VitalsPanel />
      <Legend />
    </div>
  )
}
