const ITEMS = [
  { color: '#00d4aa', label: 'shallow (0-1)' },
  { color: '#7c6cf0', label: 'mid (2-4)' },
  { color: '#ff6b35', label: 'deep (5-8)' },
  { color: '#ffaa00', label: 'core (9+)' },
]

export default function Legend() {
  return (
    <div style={{
      position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '16px', alignItems: 'center',
      fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
      color: 'rgba(148,163,184,0.4)', zIndex: 100,
    }}>
      {ITEMS.map((item) => (
        <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, boxShadow: `0 0 4px ${item.color}` }} />
          {item.label}
        </span>
      ))}
      <span style={{ opacity: 0.6, marginLeft: '8px' }}>Click blocks · Scroll zoom · Drag rotate</span>
    </div>
  )
}
