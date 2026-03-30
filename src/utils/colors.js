import * as THREE from 'three'

// Metabolic color ramp: teal → indigo → orange → red
const COLOR_STOPS = [
  { t: 0.0, color: new THREE.Color('#00e5cc') },
  { t: 0.33, color: new THREE.Color('#6366f1') },
  { t: 0.66, color: new THREE.Color('#f97316') },
  { t: 1.0, color: new THREE.Color('#ef4444') },
]

export function getMetabolicColor(depthNorm) {
  const t = Math.max(0, Math.min(1, depthNorm))
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (t >= COLOR_STOPS[i].t && t <= COLOR_STOPS[i + 1].t) {
      const localT = (t - COLOR_STOPS[i].t) / (COLOR_STOPS[i + 1].t - COLOR_STOPS[i].t)
      const c = new THREE.Color()
      c.lerpColors(COLOR_STOPS[i].color, COLOR_STOPS[i + 1].color, localT)
      return c
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1].color.clone()
}

// Category colors for distinct identification
export const CATEGORY_COLORS = {
  code: '#00e5cc',
  data: '#6366f1',
  research: '#f97316',
  creative: '#ec4899',
}

// Outcome colors for trajectory events
export const OUTCOME_COLORS = {
  dead_end: '#ef4444',
  pivot: '#f59e0b',
  converged: '#10b981',
}

/**
 * Generate points along a spiral ring for visual reference
 */
export function generateRingPoints(radius, segments = 128, y = 0) {
  const points = []
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius,
    ))
  }
  return points
}

/**
 * Create a curved line between two 3D positions (for causal edges)
 */
export function createCurvedPath(from, to, arcHeight = 0.3) {
  const mid = new THREE.Vector3(
    (from[0] + to[0]) / 2,
    Math.max(from[1], to[1]) + arcHeight,
    (from[2] + to[2]) / 2,
  )
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...from),
    mid,
    new THREE.Vector3(...to),
  )
  return curve.getPoints(20)
}
