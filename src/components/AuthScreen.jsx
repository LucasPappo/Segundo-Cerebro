import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    if (isLogin) {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      if (!name.trim()) { setError('Ingresá tu nombre'); setLoading(false); return }
      const { error } = await signUp(email, password, name)
      if (error) setError(error.message)
      else setSuccess('¡Cuenta creada! Revisá tu email si se requiere confirmación.')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 16, padding: 32,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', margin: 0 }}>Segundo Cerebro</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {isLogin ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!isLogin && (
            <div>
              <label style={labelStyle}>Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>{error}</div>}
          {success && <div style={{ background: 'var(--green-dim)', color: 'var(--green)', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>{success}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{
            background: 'var(--accent)', color: '#fff', borderRadius: 8,
            padding: '12px', fontSize: 14, fontWeight: 700, marginTop: 4,
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Cargando...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
          </button>

          <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess('') }} style={{
            color: 'var(--text-muted)', fontSize: 13, padding: 8, textAlign: 'center',
          }}>
            {isLogin ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8,
}
