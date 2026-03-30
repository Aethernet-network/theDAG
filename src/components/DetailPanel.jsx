import { useExplorerStore } from '../stores/explorerStore'
import { getDepthColor } from './EventNode'

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color || 'rgba(200,215,225,0.9)' }}>{String(value)}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: '9px', letterSpacing: '1px', color: 'rgba(148,163,184,0.4)', marginBottom: '6px', fontWeight: 600 }}>{children}</div>
}

function ClickableEvent({ event, onClick }) {
  const color = getDepthColor(event.verificationDepth)
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginBottom: '2px' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '10px', color: 'rgba(200,215,225,0.6)', flex: 1 }}>
        {event.category} · {event.agent || event.creator || 'agent'} · D:{event.verificationDepth}
      </span>
      <span style={{ color: 'rgba(148,163,184,0.2)' }}>→</span>
    </div>
  )
}

export default function DetailPanel() {
  const selected = useExplorerStore((s) => s.selectedEvent)
  const events = useExplorerStore((s) => s.events)
  const setSelected = useExplorerStore((s) => s.setSelectedEvent)
  const startTrace = useExplorerStore((s) => s.startTrace)
  const isTracing = useExplorerStore((s) => s.isTracing)
  const traceGenesisResult = useExplorerStore((s) => s.traceGenesisResult)

  if (!selected || isTracing || traceGenesisResult) return null

  const color = getDepthColor(selected.verificationDepth)
  const parents = events.filter((e) => selected.causalRefs?.includes(e.id))
  const children = events.filter((e) => e.causalRefs?.includes(selected.id))

  return (
    <div style={{
      position: 'fixed', top: '80px', right: '20px', width: '320px',
      maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
      background: 'rgba(8,10,18,0.92)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
      padding: '20px', fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px', color: 'rgba(200,215,225,0.9)', zIndex: 100,
      animation: 'slideInRight 0.3s ease-out',
    }}>
      <div onClick={() => setSelected(null)} style={{ position: 'absolute', top: '12px', right: '14px', cursor: 'pointer', color: 'rgba(148,163,184,0.3)', fontSize: '16px' }}>x</div>

      <div style={{ display: 'inline-block', background: color, color: '#fff', padding: '2px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', marginBottom: '12px' }}>
        {selected.category?.toUpperCase()}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <InfoRow label="Event ID" value={selected.id} />
        <InfoRow label="Type" value={selected.type} />
        <InfoRow label="Agent" value={selected.agent || selected.creator || '—'} color={color} />
        <InfoRow label="Depth" value={selected.verificationDepth} color={color} />
        <InfoRow label="Revolution" value={selected.revolution} />
        <InfoRow label="Causal Refs" value={selected.causalRefs?.length || 0} />
      </div>

      <div style={{ marginBottom: '16px', fontSize: '10px', color: 'rgba(148,163,184,0.5)', lineHeight: 1.5 }}>{selected.description}</div>

      {parents.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SectionLabel>PARENTS ({parents.length})</SectionLabel>
          {parents.map((p) => <ClickableEvent key={p.id} event={p} onClick={() => setSelected(p, 'panel')} />)}
        </div>
      )}

      {children.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <SectionLabel>CHILDREN ({children.length})</SectionLabel>
          {children.slice(0, 8).map((c) => <ClickableEvent key={c.id} event={c} onClick={() => setSelected(c, 'panel')} />)}
          {children.length > 8 && <div style={{ fontSize: '9px', color: 'rgba(148,163,184,0.3)', padding: '4px 0' }}>+{children.length - 8} more</div>}
        </div>
      )}

      {selected.verificationDepth > 0 && !isTracing && (
        <button onClick={startTrace} style={{
          width: '100%', padding: '8px', background: color, color: '#fff', border: 'none',
          borderRadius: '6px', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
          fontWeight: 600, letterSpacing: '1px', cursor: 'pointer',
        }}>TRACE GENESIS CHAIN</button>
      )}
    </div>
  )
}
