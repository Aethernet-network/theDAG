import { useExplorerStore } from '../stores/explorerStore'
import { getDepthColor } from './EventNode'

function ClickableEvent({ event, onClick }) {
  const color = getDepthColor(event.verificationDepth)
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', marginBottom: '2px' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color }}>
          {event.category.toUpperCase()}
          <span style={{ color: 'rgba(148,163,184,0.4)', fontWeight: 400, marginLeft: '6px' }}>D:{event.verificationDepth}</span>
        </div>
        <div style={{ fontSize: '9px', color: 'rgba(148,163,184,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.agent || event.creator || 'agent'}
        </div>
      </div>
      <span style={{ color: 'rgba(148,163,184,0.2)', fontSize: '14px' }}>→</span>
    </div>
  )
}

export default function TraceResultPanel() {
  const result = useExplorerStore((s) => s.traceGenesisResult)
  const setSelected = useExplorerStore((s) => s.setSelectedEvent)
  const clearTraceResult = useExplorerStore((s) => s.clearTraceResult)

  if (!result) return null

  const { genesis, children, chainLength } = result
  const color = getDepthColor(genesis.verificationDepth)

  return (
    <div style={{
      position: 'fixed', top: '80px', right: '20px', width: '340px',
      maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
      background: 'rgba(8,10,18,0.95)', backdropFilter: 'blur(20px)',
      border: `2px solid ${color}`, borderRadius: '12px', padding: '20px',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '11px',
      color: 'rgba(200,215,225,0.9)', zIndex: 110,
      animation: 'slideInRight 0.4s ease-out', boxShadow: `0 4px 40px ${color}30`,
    }}>
      <div onClick={clearTraceResult} style={{ position: 'absolute', top: '12px', right: '14px', cursor: 'pointer', color: 'rgba(148,163,184,0.3)', fontSize: '16px' }}>x</div>

      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'rgba(148,163,184,0.4)', fontWeight: 600, marginBottom: '6px' }}>GENESIS REACHED</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color }}>{genesis.type === 'genesis' ? genesis.creator : genesis.agent}</div>
        <div style={{ fontSize: '10px', color: 'rgba(148,163,184,0.5)', marginTop: '2px' }}>{genesis.description}</div>
      </div>

      <div style={{ display: 'flex', gap: '12px', padding: '8px 12px', marginBottom: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color }}>{chainLength}</div>
          <div style={{ fontSize: '8px', color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase' }}>hops traced</div>
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color }}>{genesis.category}</div>
          <div style={{ fontSize: '8px', color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase' }}>origin domain</div>
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color }}>D:{genesis.verificationDepth}</div>
          <div style={{ fontSize: '8px', color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase' }}>depth</div>
        </div>
      </div>

      {children.length > 0 && (
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '1px', color: 'rgba(148,163,184,0.35)', marginBottom: '6px', fontWeight: 600 }}>
            FIRST PATHS FROM GENESIS ({children.length})
          </div>
          {children.map((c) => (
            <ClickableEvent key={c.id} event={c} onClick={() => { clearTraceResult(); setSelected(c, 'panel') }} />
          ))}
        </div>
      )}
    </div>
  )
}
