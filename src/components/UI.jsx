export const Card = ({ children, style, onClick, ...props }) => (
  <div onClick={onClick} style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 16, marginBottom: 12,
    transition: 'background 0.15s', ...style,
  }} {...props}>
    {children}
  </div>
)

export const Button = ({ children, color = 'var(--accent)', variant = 'solid', style, ...props }) => (
  <button style={{
    background: variant === 'solid' ? color : 'transparent',
    color: variant === 'solid' ? '#fff' : color,
    border: variant === 'solid' ? 'none' : `1px solid ${color}40`,
    borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'all 0.15s', ...style,
  }} {...props}>
    {children}
  </button>
)

export const Tag = ({ children, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: color + '18', color,
  }}>
    {children}
  </span>
)

export const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8,
    }}>{label}</label>
    {children}
  </div>
)

export const Modal = ({ title, onClose, children, width = 420 }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16, backdropFilter: 'blur(4px)',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 24, width: '100%', maxWidth: width,
      maxHeight: '85vh', overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, fontSize: 18 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
)

export const SharedToggle = ({ shared, onChange }) => (
  <div style={{
    display: 'flex', background: 'var(--bg)', borderRadius: 8,
    border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 14,
  }}>
    {['personal', 'compartido'].map(mode => (
      <button key={mode} onClick={() => onChange(mode === 'compartido')} style={{
        flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 600,
        textTransform: 'capitalize',
        background: (mode === 'compartido') === shared ? 'var(--accent-dim)' : 'transparent',
        color: (mode === 'compartido') === shared ? 'var(--accent)' : 'var(--text-muted)',
      }}>
        {mode === 'compartido' ? '👥 Compartido' : '👤 Personal'}
      </button>
    ))}
  </div>
)

export const formatCurrency = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000000) return (n < 0 ? '-' : '') + '$' + (abs / 1000000).toFixed(1) + 'M'
  if (abs >= 1000) return (n < 0 ? '-' : '') + '$' + (abs / 1000).toFixed(1) + 'K'
  return '$' + n.toFixed(0)
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export const formatDate = (d) => {
  const date = new Date(d)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

export const today = () => new Date().toISOString().split('T')[0]

export const PRIORITY_COLORS = { alta: 'var(--red)', media: 'var(--orange)', baja: 'var(--green)' }
export const PROJECT_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#bc8cff', '#f778ba', '#39d2c0']
