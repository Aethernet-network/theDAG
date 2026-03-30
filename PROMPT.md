# AetherNet Metabolic Explorer — Claude Code Build Prompt

## STOP. Read this entire document before writing any code.

Previous attempts failed because they fought the tools — raw GLSL shaders, custom WebGL, imperative Three.js. This version uses **react-three-fiber + @react-three/drei + @react-three/postprocessing** the way they're designed. Stunning visuals from composing declarative React components. No custom shaders.

Build incrementally. Check the browser after every step. 20 lines → check → adjust → 20 more.

---

## Pre-Flight

```bash
cd ~/metabolic-explorer
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing zustand lucide-react r3f-perf
npm run dev
```

Open `http://localhost:5173`. Keep it open.

---

## Project State

This is a Vite + React project. Some files from previous attempts exist. Here's what to do with them:

**Keep the store structure (adapt as needed):**
- `src/stores/explorerStore.js` — Zustand store with events, layers, selection/hover, live simulation. You may need to adjust the mock data generator to match this spec's data shape.
- `src/index.css` — Global styles (dark theme, fonts). Keep.

**Rewrite EVERYTHING else.** The previous visual layer is broken. Start clean:
- `src/App.jsx` — New layout with Canvas + HTML overlay sidebar/panels
- `src/components/*` — All new
- `src/layers/*` — All new
- `src/utils/*` — Keep `colors.js` if useful, replace rest

The ONLY 3D dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`. No custom GLSL. No raw WebGL.

---

## The Product

An interactive 3D explorer where the DAG is rendered as glowing spheres connected by luminous curved lines on a dark field. Every node is clickable. Causal chains are traceable. Events are searchable. It looks alive — bloom makes everything glow — but every element serves comprehension.

---

## Scene Foundation

```jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing'

<Canvas camera={{ position: [0, 350, 450], fov: 55 }}>
  <ambientLight intensity={0.15} />
  <pointLight position={[0, 200, 0]} intensity={0.5} color="#7F77DD" />
  <Stars radius={800} depth={100} count={3000} factor={3} fade speed={0.5} />
  <MetabolicDisc />
  <OrbitControls enableDamping dampingFactor={0.05} minDistance={30} maxDistance={900} autoRotate autoRotateSpeed={0.3} />
  <EffectComposer>
    <Bloom intensity={1.8} luminanceThreshold={0.15} luminanceSmoothing={0.9} radius={0.8} />
    <DepthOfField focusDistance={0.01} focalLength={0.02} bokehScale={3} />
    <Vignette darkness={0.5} offset={0.3} />
  </EffectComposer>
</Canvas>
```

**This foundation — Stars + Bloom + DOF + Vignette + dark background — creates 80% of the cinematic feel.** Get this rendering FIRST before adding data.

---

## Node Rendering: Drei Sphere + Emissive + Float

Each DAG event = ONE small glowing sphere with emissive material that Bloom picks up. Float adds organic bobbing.

```jsx
import { Sphere, Float } from '@react-three/drei'

function EventNode({ position, color, size, depth, isSelected, isHovered, onClick, onHover }) {
  const radius = 0.5 + size * 0.5
  const emissiveIntensity = 1.0 + depth * 0.3
  return (
    <Float speed={1.5} rotationIntensity={0} floatIntensity={0.3} floatingRange={[-0.2, 0.2]}>
      <Sphere args={[radius, 16, 16]} position={position}
        onClick={onClick} onPointerOver={() => onHover(true)} onPointerOut={() => onHover(false)}>
        <meshStandardMaterial color={color} emissive={color}
          emissiveIntensity={isSelected ? emissiveIntensity * 2.5 : isHovered ? emissiveIntensity * 1.8 : emissiveIntensity}
          transparent opacity={isSelected ? 1.0 : isHovered ? 0.95 : 0.7}
          roughness={0.2} metalness={0.1} />
      </Sphere>
    </Float>
  )
}
```

Color by depth: `depth ≤ 1 → #1D9E75 (teal)`, `≤ 4 → #7F77DD (purple)`, `≤ 8 → #D85A30 (coral)`, `9+ → #EF9F27 (amber)`.

Size by causal density: `radius = 0.5 + Math.min(causalDensity * 0.3, 2.5)`.

---

## Connections: QuadraticBezierLine

```jsx
import { QuadraticBezierLine } from '@react-three/drei'

function CausalConnection({ start, end, weight, isHighlighted, color }) {
  const mid = [(start[0]+end[0])/2, (start[1]+end[1])/2 + weight*5 + 3, (start[2]+end[2])/2]
  return (
    <QuadraticBezierLine start={start} end={end} mid={mid} color={color}
      lineWidth={isHighlighted ? 2.5 : 0.5} transparent opacity={isHighlighted ? 0.85 : 0.06} />
  )
}
```

Base opacity 0.06 = invisible individually, fibrous web in aggregate. Hover/click → 0.85 opacity reveals specific chains.

---

## Flowing Light on Selection: Trail

Only for selected node's connections (max ~50 at once):

```jsx
import { Trail } from '@react-three/drei'

function FlowingConnection({ curve, color }) {
  const meshRef = useRef()
  useFrame(({ clock }) => {
    const t = (clock.getElapsedTime() * 0.2) % 1
    meshRef.current.position.copy(curve.getPoint(t))
  })
  return (
    <Trail width={1.5} length={8} color={color} attenuation={(w) => w * w}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={3} transparent opacity={0.8} />
      </mesh>
    </Trail>
  )
}
```

Creates river-of-light effect showing causal flow direction. Bloom makes the trail glow.

---

## Layout: Disc Formation

```js
function computeNodePosition(event) {
  const depth = event.verificationDepth || 0
  // Seed random from event ID for deterministic positions
  const seed = hashCode(event.id)
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }

  let r
  if (depth <= 1) r = 180 + rand() * 60
  else if (depth <= 4) r = 110 + rand() * 60
  else if (depth <= 8) r = 50 + rand() * 50
  else r = rand() * 40

  const categoryAngles = { code: 0, data: 90, research: 180, creative: 270 }
  const baseAngle = (categoryAngles[event.category] || 0) * Math.PI / 180
  const angle = baseAngle + rand() * (80 * Math.PI / 180)
  const y = depth * 2 + (1 - r / 240) * 15

  return [Math.cos(angle) * r, y, Math.sin(angle) * r]
}
```

---

## Interaction: Click → Data Panel (drei Html)

```jsx
import { Html } from '@react-three/drei'

// At selected node's position, render clickable data panel
<Html position={selectedPosition} distanceFactor={200} style={{
  transform: 'translateX(30px)', width: '320px',
  background: 'rgba(8,10,18,0.92)', border: '1px solid rgba(60,180,160,0.2)',
  borderRadius: '12px', padding: '20px', color: 'rgba(200,215,225,0.9)',
  fontFamily: 'monospace', fontSize: '12px', backdropFilter: 'blur(12px)', pointerEvents: 'auto',
}}>
  {/* Event details + clickable genesis chain + clickable connected events */}
</Html>
```

Click any entry → camera smooth-flies to that node (lerp in useFrame, 0.03 factor), panel updates.

---

## Search

HTML sidebar input. Filter by ID, agent, category, type. Matching nodes full brightness, non-matching dim to 0.15. Click result → fly to + select.

---

## Trace Mode

"Trace Chain" button on selected node. Sequentially highlights genesis chain (400ms per step). Each node boosts emissive to 4.0. FlowingConnection added per link. Non-chain nodes dim to 0.1. Breadcrumb trail in panel.

**THE product demo:** trace a depth-9 core node back to a genesis event on the outer ring, watching each link illuminate.

---

## Build Order

### Step 1: Scene + Bloom + Stars
Canvas, lights, Stars, Bloom, DOF, Vignette, OrbitControls. No data.
**Check:** Cinematic dark space scene? Stars visible? → Step 2.

### Step 2: Glowing Nodes
200 events as Sphere + Float + emissive on disc layout. Color by depth.
**Check:** Distinct glowing spheres with bloom halos? Disc shape clear? → Step 3.

### Step 3: Connections + Hover
QuadraticBezierLine at 0.06 opacity. Hover brightens node + its connections.
**Check:** Fibrous web in aggregate? Hover reveals specific chains? → Step 4.

### Step 4: Click + Data Panel
Click selects. Html panel appears. Non-selected dims. Click entries to navigate.
**Check:** Click sphere → data → click parent → fly there → new data? → Step 5.

### Step 5: FlowingConnections
Trail-based flowing light on selected connections.
**Check:** Flowing light visible on selected chains? Direction clear? → Step 6.

### Step 6: Search + Trace
Search bar + trace animation.
**Check:** Search "genesis" → outer ring glows? Trace → sequential illumination? → Step 7.

### Step 7: Polish
Guide rings, labels, layer toggles, vitals, auto-orbit, remove Perf.
**Done.**

---

## What Failed Before

1. Custom GLSL → buggy. Fix: drei components.
2. Points/PointsMaterial → no glow, no interaction. Fix: Sphere + emissive.
3. Particle clusters per node → noise. Fix: one sphere per event.
4. Raw Three.js → fights React. Fix: R3F declarative.
5. No bloom → dead dots. Fix: Bloom is step 1.
6. Oversized geometry → blob. Fix: radius 0.5-3 on 500-unit disc.
7. No interaction → useless. Fix: click/search/trace are core.
8. Blind coding → compounding errors. Fix: check every 20 lines.

---

## DO NOT

- Use `new THREE.Mesh()` or `scene.add()`
- Use Points/PointsMaterial for nodes
- Write custom GLSL shaders
- Use force-directed layout
- Render >50 FlowingConnections at once
- Put text in WebGL (use Html from drei)
- Skip Bloom

---

## The Moment

Someone clicks an amber sphere near the core. Data panel: verified research, depth 9, agent atlas-7b. They click "Trace Chain." Link by link — 9 agents, 3 categories, across the disc — back to a teal sphere on the outer ring: "genesis: human paper by elena.marchetti." They just watched trust compound. They get it.

Build that.
