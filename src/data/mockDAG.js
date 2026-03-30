/**
 * Mock DAG generator for the Metabolic Explorer.
 * Produces a structurally realistic AetherNet DAG with:
 * - Causal chains (parent references)
 * - Verification depths
 * - Category assignments
 * - Trajectory events (dead ends, pivots, convergences)
 * - Genesis events (human origin work)
 * - Cross-domain bridges
 *
 * Replace with real API calls when endpoints are ready.
 */

const CATEGORIES = ['code', 'data', 'research', 'creative']
const CATEGORY_ANGLES = { code: 0, data: 90, research: 180, creative: 270 }

const AGENT_NAMES = [
  'atlas-7b', 'nova-13b', 'cipher-3b', 'helix-70b', 'pulse-7b',
  'drift-13b', 'nexus-3b', 'prism-70b', 'echo-7b', 'flux-13b',
  'vortex-3b', 'spark-70b', 'arc-7b', 'wave-13b', 'core-3b',
  'zenith-70b', 'trace-7b', 'orbit-13b', 'shard-3b', 'apex-70b',
]

const HUMAN_CREATORS = [
  'elena.marchetti', 'kai.tanaka', 'sarah.okonkwo', 'liam.chen',
  'maya.rodriguez', 'alex.petrov', 'nina.johansson', 'omar.hassan',
]

let eventIdCounter = 0

function generateId() {
  return `evt_${(++eventIdCounter).toString(36).padStart(6, '0')}`
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

/**
 * Generate a complete mock DAG
 * @param {number} eventCount - Total events to generate
 * @returns {Object} - Full DAG state
 */
export function generateMockDAG(eventCount = 200) {
  const events = []
  const agents = new Map()
  const genesisEvents = []
  const trajectories = []
  const bridges = []

  // Phase 1: Generate genesis events (human origin work)
  const genesisCount = Math.max(4, Math.floor(eventCount * 0.08))
  for (let i = 0; i < genesisCount; i++) {
    const id = generateId()
    const category = CATEGORIES[i % CATEGORIES.length]
    const creator = pick(HUMAN_CREATORS)
    const evt = {
      id,
      type: 'genesis',
      category,
      agent: null,
      creator,
      timestamp: Date.now() - (eventCount - i) * 60000 * randomBetween(2, 5),
      causalRefs: [],
      verificationDepth: 0,
      genesisChain: [id],
      revolution: 0,
      description: `Human genesis: ${category} seed by ${creator}`,
    }
    events.push(evt)
    genesisEvents.push(evt)
  }

  // Phase 2: Generate agent work events building on the DAG
  for (let i = genesisCount; i < eventCount; i++) {
    const id = generateId()
    const agentName = pick(AGENT_NAMES)
    const category = pick(CATEGORIES)

    // Pick 1-3 parent events from existing events (bias toward recent)
    const parentCount = Math.random() < 0.6 ? 1 : Math.random() < 0.8 ? 2 : 3
    const parents = []
    for (let p = 0; p < parentCount; p++) {
      // Bias toward more recent events
      const recentBias = Math.pow(Math.random(), 0.5)
      const idx = Math.floor(recentBias * events.length)
      const parent = events[Math.min(idx, events.length - 1)]
      if (!parents.find(pp => pp.id === parent.id)) {
        parents.push(parent)
      }
    }

    // Compute verification depth from parents
    const maxParentDepth = parents.length > 0
      ? Math.max(...parents.map(p => p.verificationDepth))
      : 0
    const depthIncrement = Math.random() < 0.4 ? 1 : 0
    const verificationDepth = maxParentDepth + depthIncrement

    // Compute genesis chain (union of parent genesis chains)
    const genesisChain = [...new Set(parents.flatMap(p => p.genesisChain))]

    // Compute revolution (based on genesis chain depth)
    const revolution = Math.min(
      Math.floor(verificationDepth / 3),
      4
    )

    // Determine if this is a cross-domain bridge
    const parentCategories = [...new Set(parents.map(p => p.category))]
    const isBridge = parentCategories.length > 1 && !parentCategories.includes(category)

    const evt = {
      id,
      type: 'evidence',
      category,
      agent: agentName,
      creator: null,
      timestamp: Date.now() - (eventCount - i) * 60000 * randomBetween(0.5, 2),
      causalRefs: parents.map(p => p.id),
      verificationDepth,
      genesisChain,
      revolution,
      description: `${agentName} ${category} work (depth ${verificationDepth})`,
    }
    events.push(evt)

    // Track agent
    if (!agents.has(agentName)) {
      agents.set(agentName, {
        id: agentName,
        eventsCount: 0,
        categories: new Set(),
        maxDepth: 0,
        revolutions: new Set(),
      })
    }
    const agent = agents.get(agentName)
    agent.eventsCount++
    agent.categories.add(category)
    agent.maxDepth = Math.max(agent.maxDepth, verificationDepth)
    agent.revolutions.add(revolution)

    // Generate trajectory events (25% of events have trajectory data)
    if (Math.random() < 0.25) {
      const outcomes = ['dead_end', 'dead_end', 'dead_end', 'pivot', 'converged', 'converged']
      const outcome = pick(outcomes)
      trajectories.push({
        eventId: id,
        agent: agentName,
        category,
        outcome,
        timestamp: evt.timestamp,
        revolution,
      })
    }

    // Record bridges
    if (isBridge) {
      bridges.push({
        eventId: id,
        agent: agentName,
        fromCategories: parentCategories,
        toCategory: category,
        timestamp: evt.timestamp,
        verificationDepth,
      })
    }
  }

  // Compute metrics
  const recentEvents = events.filter(e => e.timestamp > Date.now() - 3600000)
  const convergedTrajectories = trajectories.filter(t => t.outcome === 'converged')
  const deadEndTrajectories = trajectories.filter(t => t.outcome === 'dead_end')
  const avgDepth = events.reduce((s, e) => s + e.verificationDepth, 0) / events.length
  const genesisUtilization = genesisEvents.filter(ge =>
    events.some(e => e.type !== 'genesis' && e.genesisChain.includes(ge.id))
  ).length / genesisEvents.length

  // Find dark zones (categories with high dead-end rates)
  const darkZones = []
  for (const cat of CATEGORIES) {
    const catTrajectories = trajectories.filter(t => t.category === cat)
    const catDeadEnds = catTrajectories.filter(t => t.outcome === 'dead_end')
    if (catTrajectories.length > 2 && catDeadEnds.length / catTrajectories.length > 0.5) {
      darkZones.push({
        category: cat,
        deadEndRate: catDeadEnds.length / catTrajectories.length,
        count: catDeadEnds.length,
      })
    }
  }

  const metrics = {
    metabolicThroughput: (recentEvents.length / 60).toFixed(2),
    metabolicEfficiency: trajectories.length > 0
      ? (convergedTrajectories.length / trajectories.length * 100).toFixed(1)
      : '0.0',
    spiralDepth: avgDepth.toFixed(1),
    verificationDensity: (events.filter(e => e.verificationDepth > 3).length / events.length * 100).toFixed(1),
    genesisUtilization: (genesisUtilization * 100).toFixed(1),
    activeAgents: new Set(recentEvents.map(e => e.agent).filter(Boolean)).size,
    darkZoneCount: darkZones.length,
    bridgeCount: bridges.filter(b => b.timestamp > Date.now() - 86400000).length,
  }

  return {
    events,
    agents: Object.fromEntries([...agents.entries()].map(([k, v]) => [k, {
      ...v,
      categories: [...v.categories],
      revolutions: [...v.revolutions],
    }])),
    genesisEvents,
    trajectories,
    bridges,
    darkZones,
    metrics,
    categoryAngles: CATEGORY_ANGLES,
  }
}

/**
 * Deterministic hash from string
 */
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * Compute helix layout positions for all events
 * Angle = timestamp progression along helix
 * Height (Y) = verification depth
 * Radius ~100 units, cylindrical helix with 4 revolutions
 */
export function computeSpiralLayout(events, categoryAngles) {
  // Pre-compute incoming refs for causal density
  const incomingMap = {}
  for (const evt of events) {
    for (const ref of evt.causalRefs) {
      incomingMap[ref] = (incomingMap[ref] || 0) + 1
    }
  }

  // Sort by timestamp for helix progression
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp)
  const indexMap = {}
  sorted.forEach((evt, i) => { indexMap[evt.id] = i })
  const total = sorted.length

  const categoryOffsets = { code: 0, data: 5, research: 10, creative: 15 }
  const totalRevolutions = Math.max(6, Math.ceil(total / 40))

  return events.map((evt) => {
    const depth = evt.verificationDepth || 0
    const incomingRefs = incomingMap[evt.id] || 0
    const index = indexMap[evt.id]

    // Progress along the helix (0 to 1)
    const progress = index / total

    // Helix angle
    const angle = progress * totalRevolutions * Math.PI * 2
    const radius = 150 + depth * 8

    // Category offset to avoid overlap
    const catOffset = categoryOffsets[evt.category] || 0

    // Height: depth-driven + progress slope — tall helix
    const y = depth * 40 + progress * 80

    const x = Math.cos(angle) * (radius + catOffset)
    const z = Math.sin(angle) * (radius + catOffset)

    const position = [x, y, z]

    // Size by causal density
    const size = 0.5 + Math.min(incomingRefs * 0.3, 2.5)

    // Depth norm for color
    const depthNorm = Math.min(depth / 10, 1)

    return {
      ...evt,
      position,
      radius,
      angle,
      size,
      depthNorm,
      incomingRefs,
    }
  })
}

/**
 * Simulate a new event arriving (for real-time animation)
 */
export function generateNewEvent(existingEvents) {
  const id = generateId()
  const agentName = pick(AGENT_NAMES)
  const category = pick(CATEGORIES)

  const recentEvents = existingEvents.slice(-30)
  const parent = pick(recentEvents)

  const verificationDepth = parent.verificationDepth + (Math.random() < 0.4 ? 1 : 0)
  const revolution = Math.min(Math.floor(verificationDepth / 3), 4)

  return {
    id,
    type: 'evidence',
    category,
    agent: agentName,
    creator: null,
    timestamp: Date.now(),
    causalRefs: [parent.id],
    verificationDepth,
    genesisChain: [...parent.genesisChain],
    revolution,
    description: `${agentName} ${category} work (depth ${verificationDepth})`,
    isNew: true,
  }
}
