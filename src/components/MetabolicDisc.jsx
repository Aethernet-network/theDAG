import { useMemo } from 'react'
import { useExplorerStore } from '../stores/explorerStore'
import EventNode, { getDepthColor } from './EventNode'
import CausalConnection from './CausalConnection'
import ElectricalParticles from './ElectricalParticles'
import GlassSlides from './GlassSlides'
import TraceLine from './TraceLine'

export default function MetabolicDisc() {
  const events = useExplorerStore((s) => s.events)
  const selectedEvent = useExplorerStore((s) => s.selectedEvent)
  const hoveredEvent = useExplorerStore((s) => s.hoveredEvent)
  const setSelectedEvent = useExplorerStore((s) => s.setSelectedEvent)
  const setHoveredEvent = useExplorerStore((s) => s.setHoveredEvent)
  const searchQuery = useExplorerStore((s) => s.searchQuery)
  const traceChain = useExplorerStore((s) => s.traceChain)
  const storeIsTracing = useExplorerStore((s) => s.isTracing)
  const layers = useExplorerStore((s) => s.layers)

  const eventMap = useMemo(() => {
    const map = {}
    for (const evt of events) map[evt.id] = evt
    return map
  }, [events])

  const connections = useMemo(() => {
    const conns = []
    for (const evt of events) {
      for (const refId of evt.causalRefs) {
        const parent = eventMap[refId]
        if (parent) {
          conns.push({
            id: `${evt.id}-${refId}`,
            child: evt,
            parent: parent,
            childId: evt.id,
            parentId: refId,
          })
        }
      }
    }
    return conns
  }, [events, eventMap])

  const searchMatchIds = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return null
    const q = searchQuery.toLowerCase()
    const ids = new Set()
    for (const e of events) {
      if (
        e.id.toLowerCase().includes(q) || (e.agent && e.agent.toLowerCase().includes(q)) ||
        (e.creator && e.creator.toLowerCase().includes(q)) || e.category.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
      ) ids.add(e.id)
    }
    return ids
  }, [searchQuery, events])

  const traceIds = useMemo(() => {
    if (!storeIsTracing || traceChain.length === 0) return null
    const ids = new Set()
    for (const evt of traceChain) ids.add(evt.id)
    return ids
  }, [storeIsTracing, traceChain])

  const activeEventId = hoveredEvent?.id || selectedEvent?.id
  const highlightedIds = useMemo(() => {
    if (!activeEventId) return new Set()
    const ids = new Set()
    for (const conn of connections) {
      if (conn.childId === activeEventId || conn.parentId === activeEventId) {
        ids.add(conn.id)
        ids.add(conn.childId)
        ids.add(conn.parentId)
      }
    }
    return ids
  }, [activeEventId, connections])

  const traceConnIds = useMemo(() => {
    if (!traceIds || traceIds.size < 2) return new Set()
    const ids = new Set()
    for (const conn of connections) {
      if (traceIds.has(conn.childId) && traceIds.has(conn.parentId)) ids.add(conn.id)
    }
    return ids
  }, [traceIds, connections])

  const hasActive = highlightedIds.size > 0
  const isSearching = searchMatchIds !== null
  const isTracing = traceIds !== null

  function isDimmed(evt) {
    if (isTracing) return !traceIds.has(evt.id)
    if (isSearching) return !searchMatchIds.has(evt.id)
    if (hasActive) return !highlightedIds.has(evt.id)
    return false
  }

  return (
    <group>
      {/* Connections */}
      {connections.map((conn) => (
        <CausalConnection
          key={conn.id}
          start={conn.parent.position}
          end={conn.child.position}
          isHighlighted={highlightedIds.has(conn.id) || traceConnIds.has(conn.id)}
          color={getDepthColor(conn.child.verificationDepth)}
        />
      ))}

      {/* Single instanced mesh for all electrical particles */}
      <ElectricalParticles connections={connections} getColor={getDepthColor} />

      {/* Nodes */}
      {events.map((evt) => (
        <EventNode
          key={evt.id}
          event={evt}
          isSelected={selectedEvent?.id === evt.id}
          isHovered={hoveredEvent?.id === evt.id}
          dimmed={isDimmed(evt)}
          onSelect={setSelectedEvent}
          onHover={setHoveredEvent}
        />
      ))}

      {/* Trace line during genesis trace */}
      {storeIsTracing && traceChain.length >= 2 && (
        <TraceLine chain={traceChain} />
      )}

      {/* Glass slides — trajectory exploration behind selected block */}
      {layers.exploration && selectedEvent && (
        <GlassSlides
          key={`slides-${selectedEvent.id}`}
          event={selectedEvent}
          position={selectedEvent.position}
          isSelected={true}
        />
      )}
    </group>
  )
}
