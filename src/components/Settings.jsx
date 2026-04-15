import { useState } from 'react'
import { useAuth } from './AuthContext'
import { Card, Button, Field } from './UI'

export default function Settings() {
  const { profile, signOut, linkPartner, fetchProfile, user } = useAuth()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLink = async () => {
    if (!code.trim()) return
    setLoading(true)
    setMsg('')
    const { data, error } = await linkPartner(code.trim())
    if (error) setMsg('❌ ' + error.message)
    else setMsg('✅ ¡Vinculado con ' + data.partner_name + '!')
    setLoading(false)
    setCode('')
  }

  return (
    <div>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Tu perfil</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
          {profile?.display_name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{profile?.email}</div>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Vincular pareja</div>
        {profile?.partner_id ? (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            background: 'var(--green-dim)', color: 'var(--green)', fontSize: 13,
          }}>
            ✅ Ya tenés una pareja vinculada. El espacio compartido está activo.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
              Compartí tu código con tu pareja, o ingresá el suyo para vincularse.
              Una vez vinculados, van a poder ver el espacio compartido.
            </div>

            <div style={{
              padding: '12px 16px', borderRadius: 8, background: 'var(--accent-dim)',
              marginBottom: 14, textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Tu código</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: 3 }}>
                {profile?.partner_code || '...'}
              </div>
            </div>

            <Field label="Código de tu pareja">
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="Pegá el código acá"
                onKeyDown={e => e.key === 'Enter' && handleLink()} />
            </Field>

            {msg && <div style={{ fontSize: 12, marginBottom: 10, color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}

            <Button color="var(--accent)" onClick={handleLink}
              style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Vinculando...' : 'Vincular'}
            </Button>
          </>
        )}
      </Card>

      <Card style={{ marginTop: 20 }}>
        <Button color="var(--red)" variant="ghost" onClick={signOut}
          style={{ width: '100%', justifyContent: 'center' }}>
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
