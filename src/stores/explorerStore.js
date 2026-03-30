import { create } from 'zustand'
import { generateMockDAG, computeSpiralLayout, generateNewEvent } from '../data/mockDAG'

const initialDAG = generateMockDAG(500)
const layoutEvents = computeSpiralLayout(initialDAG.events, initialDAG.categoryAngles)

export const useExplorerStore = create((set, get) => ({
  events: layoutEvents,
  rawEvents: initialDAG.events,
  agents: initialDAG.agents,
  genesisEvents: initialDAG.genesisEvents,
  trajectories: initialDAG.trajectories,
  bridges: initialDAG.bridges,
  darkZones: initialDAG.darkZones,
  metrics: initialDAG.metrics,
  categoryAngles: initialDAG.categoryAngles,

  layers: {
    causalFlow: true,
    exploration: true,
    spiralDepth: true,
    verificationDensity: true,
    genesisRoots: true,
    crossDomainBridges: true,
  },

  toggleLayer: (layerName) => set((state) => ({
    layers: { ...state.layers, [layerName]: !state.layers[layerName] },
  })),

  selectedEvent: null,
  hoveredEvent: null,

  // navSource: 'direct' = clicked block in 3D, 'panel' = sidebar/detail/search
  navSource: 'direct',

  setSelectedEvent: (evt, source) => {
    if (evt) {
      const current = get().events.find((e) => e.id === evt.id)
      const pinned = current ? { ...current } : { ...evt }
      set({ selectedEvent: pinned, navSource: source || 'direct', traceChain: [], traceIndex: -1, isTracing: false, traceGenesisResult: null })
    } else {
      set({ selectedEvent: null, navSource: 'direct', traceChain: [], traceIndex: -1, isTracing: false, traceGenesisResult: null })
    }
  },

  setHoveredEvent: (evt) => set({ hoveredEvent: evt }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  // Trace state
  traceChain: [],       // [selected, parent, ..., genesis]
  traceIndex: -1,
  isTracing: false,
  traceGenesisResult: null,

  startTrace: () => {
    const state = get()
    if (!state.selectedEvent) return

    const eventMap = {}
    for (const evt of state.events) eventMap[evt.id] = evt

    const chain = []
    const visited = new Set()
    let current = eventMap[state.selectedEvent.id] || state.selectedEvent

    while (current && !visited.has(current.id)) {
      chain.push(current)
      visited.add(current.id)
      const parentId = current.causalRefs?.[0]
      current = parentId ? eventMap[parentId] : null
    }

    if (chain.length < 2) return

    // chain = [selected, parent, ..., genesis]
    set({
      traceChain: chain,
      traceIndex: -1,
      isTracing: true,
      traceGenesisResult: null,
    })
  },

  // Called when trace camera animation finishes at genesis
  finishTrace: () => {
    const state = get()
    const chain = state.traceChain
    if (chain.length === 0) return

    const genesis = chain[chain.length - 1]
    const children = state.events.filter((e) => e.causalRefs.includes(genesis.id))

    set({
      isTracing: false,
      traceIndex: chain.length - 1,
      selectedEvent: { ...genesis },
      traceGenesisResult: {
        genesis,
        children: children.slice(0, 12),
        chainLength: chain.length,
      },
    })
  },

  clearTraceResult: () => set({ traceGenesisResult: null }),
  stopTrace: () => set({ isTracing: false, traceChain: [], traceIndex: -1, traceGenesisResult: null }),

  cameraTarget: [0, 1, 0],
  setCameraTarget: (target) => set({ cameraTarget: target }),

  isLive: true,
  setIsLive: (val) => set({ isLive: val }),

  addEvent: () => {
    const state = get()
    const newEvt = generateNewEvent(state.rawEvents)
    const updatedRaw = [...state.rawEvents, newEvt]
    const updatedLayout = computeSpiralLayout(updatedRaw, state.categoryAngles)

    const recentEvents = updatedRaw.filter(e => e.timestamp > Date.now() - 3600000)
    const avgDepth = updatedRaw.reduce((s, e) => s + e.verificationDepth, 0) / updatedRaw.length

    set({
      rawEvents: updatedRaw,
      events: updatedLayout,
      metrics: {
        ...state.metrics,
        metabolicThroughput: (recentEvents.length / 60).toFixed(2),
        spiralDepth: avgDepth.toFixed(1),
        activeAgents: new Set(recentEvents.map(e => e.agent).filter(Boolean)).size,
      },
    })
  },
}))
