import { useMemo } from 'react'
import { useExplorerStore } from '../stores/explorerStore'
import { getDepthColor } from './EventNode'

const panelStyle = {
  position: 'absolute', top: '16px', left: '16px', width: '280px',
  background: 'rgba(8,10,18,0.88)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px', padding: '16px', color: 'rgba(200,215,225,0.9)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
  backdropFilter: 'blur(20px)', zIndex: 100,
  maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
}

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
  padding: '8px 12px', color: 'rgba(200,215,225,0.9)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', outline: 'none',
}

const resultStyle = {
  padding: '6px 8px', borderRadius: '6px', cursor: 'pointer',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '2px', background: 'rgba(255,255,255,0.02)',
}

function QuickNavigateList({ events, onSelect }) {
  const quickList = useMemo(() => {
    const picks = []
    const genesis = events.filter((e) => e.type === 'genesis').slice(0, 2)
    picks.push(...genesis)
    const byDepth = [...events].sort((a, b) => b.verificationDepth - a.verificationDepth)
    picks.push(...byDepth.filter((e) => !picks.includes(e)).slice(0, 2))
    const mids = events.filter((e) => e.verificationDepth >= 3 && e.verificationDepth <= 6 && !picks.includes(e))
    picks.push(...mids.slice(0, 2))
    const shallow = events.filter((e) => e.verificationDepth <= 1 && e.type !== 'genesis' && !picks.includes(e))
    picks.push(...shallow.slice(0, 2))
    const remaining = events.filter((e) => !picks.includes(e))
    if (remaining.length > 0) picks.push(remaining[Math.floor(remaining.length * 0.3)])
    if (remaining.length > 1) picks.push(remaining[Math.floor(remaining.length * 0.7)])
    return picks.filter(Boolean).slice(0, 10)
  }, [events])

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: 'rgba(148,163,184,0.45)', marginBottom: '8px', fontWeight: 600 }}>
        QUICK NAVIGATE
      </div>
      {quickList.map((event) => {
        const color = getDepthColor(event.verificationDepth)
        return (
          <div key={event.id} onClick={() => onSelect(event)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', marginBottom: '2px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: 'rgba(200,215,225,0.8)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}60` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color }}>
                {event.category.toUpperCase()}
                <span style={{ color: 'rgba(148,163,184,0.4)', fontWeight: 400, marginLeft: '6px' }}>D:{event.verificationDepth}</span>
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(148,163,184,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.agent || event.creator || 'agent'} · {event.type === 'genesis' ? 'genesis' : event.type}
              </div>
            </div>
            <div style={{ color: 'rgba(148,163,184,0.2)', fontSize: '14px' }}>→</div>
          </div>
        )
      })}
    </div>
  )
}

export default function SearchPanel() {
  const events = useExplorerStore((s) => s.events)
  const searchQuery = useExplorerStore((s) => s.searchQuery)
  const setSearchQuery = useExplorerStore((s) => s.setSearchQuery)
  const setSelectedEvent = useExplorerStore((s) => s.setSelectedEvent)
  const selectedEvent = useExplorerStore((s) => s.selectedEvent)
  const startTrace = useExplorerStore((s) => s.startTrace)
  const isTracing = useExplorerStore((s) => s.isTracing)
  const traceChain = useExplorerStore((s) => s.traceChain)
  const traceIndex = useExplorerStore((s) => s.traceIndex)
  const stopTrace = useExplorerStore((s) => s.stopTrace)
  const layers = useExplorerStore((s) => s.layers)
  const toggleLayer = useExplorerStore((s) => s.toggleLayer)

  const results = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []
    const q = searchQuery.toLowerCase()
    return events.filter((e) =>
      e.id.toLowerCase().includes(q) || (e.agent && e.agent.toLowerCase().includes(q)) ||
      (e.creator && e.creator.toLowerCase().includes(q)) || e.category.toLowerCase().includes(q) || e.type.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [searchQuery, events])

  return (
    <div style={panelStyle}>
      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'rgba(200,215,225,0.7)' }}>AetherNet Explorer</div>
      <QuickNavigateList events={events} onSelect={(evt) => setSelectedEvent(evt, 'panel')} />
      <input style={inputStyle} placeholder="Search ID, agent, category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

      {results.length > 0 && (
        <div style={{ marginTop: '8px', overflowY: 'auto', maxHeight: '200px' }}>
          {results.map((evt) => {
            const color = getDepthColor(evt.verificationDepth)
            return (
              <div key={evt.id} style={resultStyle}
                onClick={() => { setSelectedEvent(evt, 'panel'); setSearchQuery('') }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
              >
                <div>
                  <div style={{ fontSize: '11px' }}>{evt.id}</div>
                  <div style={{ fontSize: '9px', color: 'rgba(148,163,184,0.5)' }}>{evt.type === 'genesis' ? evt.creator : evt.agent} - {evt.category}</div>
                </div>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
              </div>
            )
          })}
        </div>
      )}

      {selectedEvent && !isTracing && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '10px', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Selected</div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: getDepthColor(selectedEvent.verificationDepth), fontWeight: 600 }}>{selectedEvent.id}</span>
            <span style={{ color: 'rgba(148,163,184,0.4)', marginLeft: '8px' }}>depth {selectedEvent.verificationDepth}</span>
          </div>
          {selectedEvent.verificationDepth > 0 && (
            <button onClick={startTrace} style={{
              width: '100%', padding: '8px', background: 'rgba(0,212,170,0.12)',
              border: '1px solid rgba(0,212,170,0.3)', borderRadius: '8px', color: '#00d4aa',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', cursor: 'pointer', fontWeight: 600,
            }}>Trace Chain</button>
          )}
        </div>
      )}

      {isTracing && traceChain.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', color: '#00d4aa', textTransform: 'uppercase', fontWeight: 600 }}>Tracing...</span>
            <button onClick={stopTrace} style={{ background: 'none', border: 'none', color: 'rgba(148,163,184,0.4)', cursor: 'pointer', fontSize: '10px' }}>Stop</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '10px', color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>Layers</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', color: 'rgba(200,215,225,0.7)' }}>
          <input type="checkbox" checked={layers.exploration} onChange={() => toggleLayer('exploration')} style={{ accentColor: '#00d4aa' }} />
          Trajectory Roots
        </label>
      </div>
    </div>
  )
}
