import { useExplorerStore } from '../stores/explorerStore'

const panelStyle = {
  position: 'absolute', bottom: '16px', right: '16px',
  background: 'rgba(8,10,18,0.85)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px', padding: '14px 18px',
  color: 'rgba(200,215,225,0.8)', fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px', backdropFilter: 'blur(20px)', zIndex: 100,
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
      <span style={{ color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color: color || 'rgba(200,215,225,0.9)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export default function VitalsPanel() {
  const metrics = useExplorerStore((s) => s.metrics)
  const events = useExplorerStore((s) => s.events)
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: '10px', fontWeight: 600, marginBottom: '8px', color: 'rgba(200,215,225,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vitals</div>
      <Stat label="Events" value={events.length} />
      <Stat label="Throughput" value={`${metrics.metabolicThroughput}/min`} color="#00d4aa" />
      <Stat label="Avg Depth" value={metrics.spiralDepth} color="#7c6cf0" />
      <Stat label="Deep Verified" value={`${metrics.verificationDensity}%`} color="#ff6b35" />
      <Stat label="Active Agents" value={metrics.activeAgents} color="#ffaa00" />
      <Stat label="Efficiency" value={`${metrics.metabolicEfficiency}%`} />
      <Stat label="Genesis Util" value={`${metrics.genesisUtilization}%`} />
      <Stat label="Bridges" value={metrics.bridgeCount} />
    </div>
  )
}
