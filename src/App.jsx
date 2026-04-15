import { useState, useMemo } from 'react'
import './index.css'
import { AuthProvider, useAuth } from './components/AuthContext'
import AuthScreen from './components/AuthScreen'
import Settings from './components/Settings'
import { useSupabaseData } from './lib/useSupabaseData'
import {
  Card, Button, Tag, Field, Modal, SharedToggle,
  formatCurrency, formatDate, today,
  PRIORITY_COLORS, PROJECT_COLORS,
} from './components/UI'

// ─── FINANCE PANEL ───
function FinancePanel({ projects }) {
  const { profile } = useAuth()
  const [shared, setShared] = useState(false)
  const { data: transactions, insert, remove } = useSupabaseData('transactions', {
    orderBy: 'date', ascending: false, showShared: shared,
  })
  const { data: investments, insert: addInv, remove: removeInv } = useSupabaseData('investments')
  const [modal, setModal] = useState(null)
  const [subTab, setSubTab] = useState('resumen')
  const [txForm, setTxForm] = useState({ description: '', amount: '', category: 'Otros', type: 'gasto', date: today(), project_id: '' })
  const [invForm, setInvForm] = useState({ name: '', ticker: '', cost: '', current_value: '', type: 'acción' })

  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const gastos = monthTx.filter(t => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0)
  const ingresos = monthTx.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
  const invTotal = investments.reduce((s, i) => s + Number(i.current_value), 0)

  const byCategory = {}
  monthTx.filter(t => t.type === 'gasto').forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount) })
  const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const maxCat = catEntries.length > 0 ? catEntries[0][1] : 1

  const handleAddTx = async () => {
    if (!txForm.description || !txForm.amount) return
    await insert({
      ...txForm, amount: parseFloat(txForm.amount),
      project_id: txForm.project_id || null,
      is_shared: shared,
    })
    setTxForm({ description: '', amount: '', category: 'Otros', type: 'gasto', date: today(), project_id: '' })
    setModal(null)
  }

  const handleAddInv = async () => {
    if (!invForm.name || !invForm.cost) return
    await addInv({ ...invForm, cost: parseFloat(invForm.cost), current_value: parseFloat(invForm.current_value || invForm.cost) })
    setInvForm({ name: '', ticker: '', cost: '', current_value: '', type: 'acción' })
    setModal(null)
  }

  return (
    <div>
      {profile?.partner_id && <SharedToggle shared={shared} onChange={setShared} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['resumen', 'movimientos', 'inversiones'].map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
            background: subTab === t ? 'var(--accent-dim)' : 'transparent',
            color: subTab === t ? 'var(--accent)' : 'var(--text-muted)',
            textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {subTab === 'resumen' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Ingresos', val: ingresos, color: 'var(--green)' },
              { label: 'Gastos', val: gastos, color: 'var(--red)' },
              { label: 'Balance', val: ingresos - gastos, color: ingresos - gastos >= 0 ? 'var(--green)' : 'var(--red)' },
              { label: 'Inversiones', val: invTotal, color: 'var(--purple)' },
            ].map(s => (
              <Card key={s.label} style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(s.val)}</div>
              </Card>
            ))}
          </div>
          {catEntries.length > 0 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase' }}>Gastos por categoría</div>
              {catEntries.map(([cat, val]) => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{cat}</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(val)}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(val / maxCat) * 100}%`, background: 'linear-gradient(90deg, var(--accent), var(--purple))', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {subTab === 'movimientos' && (
        <>
          <Button color="var(--accent)" onClick={() => setModal('tx')} style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}>+ Nuevo movimiento</Button>
          {transactions.slice(0, 50).map(tx => {
            const proj = projects.find(p => p.id === tx.project_id)
            return (
              <Card key={tx.id} style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{tx.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tx.category} · {formatDate(tx.date)}
                    {tx.is_shared && <span style={{ color: 'var(--cyan)' }}> · 👥</span>}
                    {proj && <span style={{ color: 'var(--purple)' }}> · {proj.name}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: tx.type === 'ingreso' ? 'var(--green)' : 'var(--red)' }}>
                    {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </span>
                  <button onClick={() => remove(tx.id)} style={{ color: 'var(--text-dim)', padding: 4, fontSize: 12 }}>🗑</button>
                </div>
              </Card>
            )
          })}
        </>
      )}

      {subTab === 'inversiones' && (
        <>
          <Button color="var(--purple)" onClick={() => setModal('inv')} style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}>+ Nueva inversión</Button>
          {investments.map(inv => {
            const gain = Number(inv.current_value) - Number(inv.cost)
            const pct = Number(inv.cost) > 0 ? ((gain / Number(inv.cost)) * 100).toFixed(1) : 0
            return (
              <Card key={inv.id} style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{inv.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inv.ticker ? `${inv.ticker} · ` : ''}{inv.type}</div>
                  </div>
                  <button onClick={() => removeInv(inv.id)} style={{ color: 'var(--text-dim)' }}>🗑</button>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Actual</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(Number(inv.current_value))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Costo</div>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(Number(inv.cost))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rend.</div>
                    <Tag color={gain >= 0 ? 'var(--green)' : 'var(--red)'}>{gain >= 0 ? '+' : ''}{pct}%</Tag>
                  </div>
                </div>
              </Card>
            )
          })}
        </>
      )}

      {modal === 'tx' && (
        <Modal title="Nuevo movimiento" onClose={() => setModal(null)}>
          <Field label="Descripción"><input value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} placeholder="Supermercado, salario..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Monto"><input type="number" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} placeholder="0" /></Field>
            <Field label="Tipo"><select value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})}><option value="gasto">Gasto</option><option value="ingreso">Ingreso</option></select></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Categoría">
              <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})}>
                {['Vivienda','Comida','Transporte','Entretenimiento','Salud','Educación','Servicios','Otros'].map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Fecha"><input type="date" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} /></Field>
          </div>
          <Field label="Proyecto (opcional)">
            <select value={txForm.project_id} onChange={e => setTxForm({...txForm, project_id: e.target.value})}>
              <option value="">Sin proyecto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Button onClick={handleAddTx} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Guardar</Button>
        </Modal>
      )}

      {modal === 'inv' && (
        <Modal title="Nueva inversión" onClose={() => setModal(null)}>
          <Field label="Nombre"><input value={invForm.name} onChange={e => setInvForm({...invForm, name: e.target.value})} placeholder="Tesla, Bitcoin..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Ticker"><input value={invForm.ticker} onChange={e => setInvForm({...invForm, ticker: e.target.value})} placeholder="TSLA" /></Field>
            <Field label="Tipo"><select value={invForm.type} onChange={e => setInvForm({...invForm, type: e.target.value})}>{['acción','cripto','fondo','bono','inmueble','otro'].map(t => <option key={t}>{t}</option>)}</select></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Costo total"><input type="number" value={invForm.cost} onChange={e => setInvForm({...invForm, cost: e.target.value})} /></Field>
            <Field label="Valor actual"><input type="number" value={invForm.current_value} onChange={e => setInvForm({...invForm, current_value: e.target.value})} /></Field>
          </div>
          <Button color="var(--purple)" onClick={handleAddInv} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Guardar</Button>
        </Modal>
      )}
    </div>
  )
}

// ─── TASKS PANEL ───
function TasksPanel({ projects }) {
  const { profile } = useAuth()
  const [shared, setShared] = useState(false)
  const { data: tasks, insert, update, remove } = useSupabaseData('tasks', {
    orderBy: 'due_date', ascending: true, showShared: shared,
  })
  const [modal, setModal] = useState(null)
  const [filter, setFilter] = useState('pendientes')
  const [form, setForm] = useState({ title: '', priority: 'media', due_date: today(), frequency: 'única', project_id: '', notes: '' })

  const FREQ = { 'única': 'Una vez', 'diaria': 'Diaria', 'semanal': 'Semanal', 'mensual': 'Mensual' }

  const handleAdd = async () => {
    if (!form.title) return
    await insert({ ...form, project_id: form.project_id || null, completed: false, completed_dates: [], is_shared: shared })
    setForm({ title: '', priority: 'media', due_date: today(), frequency: 'única', project_id: '', notes: '' })
    setModal(null)
  }

  const toggleTask = async (task) => {
    const completed = !task.completed
    const dates = completed ? [...(task.completed_dates || []), today()] : task.completed_dates
    await update(task.id, { completed, completed_dates: dates })

    if (completed && task.frequency !== 'única') {
      const next = new Date(task.due_date)
      if (task.frequency === 'diaria') next.setDate(next.getDate() + 1)
      else if (task.frequency === 'semanal') next.setDate(next.getDate() + 7)
      else if (task.frequency === 'mensual') next.setMonth(next.getMonth() + 1)
      await insert({
        title: task.title, priority: task.priority, due_date: next.toISOString().split('T')[0],
        frequency: task.frequency, project_id: task.project_id, notes: task.notes,
        completed: false, completed_dates: [], is_shared: task.is_shared,
      })
    }
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pendientes') return !t.completed
    if (filter === 'hoy') return t.due_date === today() && !t.completed
    if (filter === 'recurrentes') return t.frequency !== 'única' && !t.completed
    if (filter === 'completadas') return t.completed
    return true
  }).sort((a, b) => {
    const p = { alta: 0, media: 1, baja: 2 }
    return (p[a.priority] || 1) - (p[b.priority] || 1)
  })

  const todayCount = tasks.filter(t => t.due_date === today() && !t.completed).length

  return (
    <div>
      {profile?.partner_id && <SharedToggle shared={shared} onChange={setShared} />}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['pendientes', 'hoy', 'recurrentes', 'completadas'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6,
            background: filter === f ? 'var(--green-dim)' : 'transparent',
            color: filter === f ? 'var(--green)' : 'var(--text-muted)',
            textTransform: 'capitalize',
          }}>{f}{f === 'hoy' && todayCount > 0 ? ` (${todayCount})` : ''}</button>
        ))}
      </div>

      <Button color="var(--green)" onClick={() => setModal('task')} style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}>+ Nueva tarea</Button>

      {filtered.map(t => {
        const proj = projects.find(p => p.id === t.project_id)
        const overdue = !t.completed && t.due_date < today()
        return (
          <Card key={t.id} style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'start', opacity: t.completed ? 0.5 : 1 }}>
            <button onClick={() => toggleTask(t)} style={{
              width: 22, height: 22, minWidth: 22, borderRadius: 6,
              border: `2px solid ${t.completed ? 'var(--green)' : PRIORITY_COLORS[t.priority]}`,
              background: t.completed ? 'var(--green)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
              color: '#fff', fontSize: 10,
            }}>{t.completed && '✓'}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Tag color={PRIORITY_COLORS[t.priority]}>{t.priority}</Tag>
                <Tag color={overdue ? 'var(--red)' : 'var(--text-muted)'}>{formatDate(t.due_date)}</Tag>
                {t.frequency !== 'única' && <Tag color="var(--cyan)">↻ {FREQ[t.frequency]}</Tag>}
                {t.is_shared && <Tag color="var(--cyan)">👥</Tag>}
                {proj && <Tag color="var(--purple)">{proj.name}</Tag>}
              </div>
            </div>
            <button onClick={() => remove(t.id)} style={{ color: 'var(--text-dim)', padding: 2, fontSize: 12 }}>🗑</button>
          </Card>
        )
      })}
      {filtered.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Sin tareas en esta vista</div>}

      {modal === 'task' && (
        <Modal title="Nueva tarea" onClose={() => setModal(null)}>
          <Field label="Título"><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Qué necesitás hacer..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Prioridad"><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></Field>
            <Field label="Fecha"><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Frecuencia"><select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>{Object.entries(FREQ).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Proyecto"><select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          </div>
          <Field label="Notas"><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ minHeight: 60, resize: 'vertical' }} /></Field>
          <Button color="var(--green)" onClick={handleAdd} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Crear tarea</Button>
        </Modal>
      )}
    </div>
  )
}

// ─── PROJECTS PANEL ───
function ProjectsPanel({ projects: projectsData, tasks: tasksData }) {
  const { profile } = useAuth()
  const [shared, setShared] = useState(false)
  const { data: projects, insert, remove } = useSupabaseData('projects', { showShared: shared })
  const { data: tasks } = useSupabaseData('tasks', { showShared: shared })
  const { data: transactions } = useSupabaseData('transactions', { showShared: shared })
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'personal', status: 'activo', description: '', deadline: '' })

  const handleAdd = async () => {
    if (!form.name) return
    await insert({ ...form, deadline: form.deadline || null, is_shared: shared })
    setForm({ name: '', type: 'personal', status: 'activo', description: '', deadline: '' })
    setModal(null)
  }

  const proj = selected ? projects.find(p => p.id === selected) : null

  if (proj) {
    const pIdx = projects.indexOf(proj)
    const color = PROJECT_COLORS[pIdx % PROJECT_COLORS.length]
    const pTasks = tasks.filter(t => t.project_id === proj.id)
    const pTx = transactions.filter(t => t.project_id === proj.id)
    const done = pTasks.filter(t => t.completed).length
    const progress = pTasks.length > 0 ? (done / pTasks.length) * 100 : 0

    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 14, padding: '6px 0' }}>← Volver</button>
        <Card style={{ borderLeft: `3px solid ${color}` }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{proj.name}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <Tag color={color}>{proj.type}</Tag>
            <Tag color={proj.status === 'activo' ? 'var(--green)' : 'var(--orange)'}>{proj.status}</Tag>
          </div>
          {proj.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>{proj.description}</p>}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Progreso</span><span>{done}/{pTasks.length}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: 3 }} />
            </div>
          </div>
        </Card>

        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Tareas</div>
        {pTasks.map(t => (
          <Card key={t.id} style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 8, opacity: t.completed ? 0.5 : 1 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[t.priority] }} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: t.completed ? 'line-through' : 'none' }}>{t.title}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(t.due_date)}</span>
          </Card>
        ))}

        {pTx.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, marginTop: 16 }}>Movimientos</div>
            {pTx.map(tx => (
              <Card key={tx.id} style={{ padding: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12 }}>{tx.description}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'ingreso' ? 'var(--green)' : 'var(--red)', fontFamily: "'JetBrains Mono'" }}>
                  {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                </span>
              </Card>
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {profile?.partner_id && <SharedToggle shared={shared} onChange={setShared} />}
      <Button color="var(--orange)" onClick={() => setModal('project')} style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}>+ Nuevo proyecto</Button>

      {projects.map((p, i) => {
        const color = PROJECT_COLORS[i % PROJECT_COLORS.length]
        const pTasks = tasks.filter(t => t.project_id === p.id)
        const done = pTasks.filter(t => t.completed).length
        const pct = pTasks.length > 0 ? ((done / pTasks.length) * 100).toFixed(0) : 0
        return (
          <Card key={p.id} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <Tag color={color}>{p.type}</Tag>
                  <Tag color={p.status === 'activo' ? 'var(--green)' : 'var(--orange)'}>{p.status}</Tag>
                  {p.is_shared && <Tag color="var(--cyan)">👥</Tag>}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); remove(p.id) }} style={{ color: 'var(--text-dim)' }}>🗑</button>
            </div>
            {pTasks.length > 0 && (
              <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
              </div>
            )}
          </Card>
        )
      })}

      {modal === 'project' && (
        <Modal title="Nuevo proyecto" onClose={() => setModal(null)}>
          <Field label="Nombre"><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Mi proyecto..." /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Tipo"><select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="personal">Personal</option><option value="laboral">Laboral</option><option value="freelance">Freelance</option></select></Field>
            <Field label="Estado"><select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="activo">Activo</option><option value="pausado">Pausado</option><option value="completado">Completado</option></select></Field>
          </div>
          <Field label="Fecha límite"><input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} /></Field>
          <Field label="Descripción"><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ minHeight: 60 }} /></Field>
          <Button color="var(--orange)" onClick={handleAdd} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Crear proyecto</Button>
        </Modal>
      )}
    </div>
  )
}

// ─── HABITS PANEL ───
function HabitsPanel() {
  const { data: habits, insert, update, remove } = useSupabaseData('habits')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', frequency: 'diaria' })

  const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

  const handleAdd = async () => {
    if (!form.name) return
    await insert({ ...form, log: [] })
    setForm({ name: '', frequency: 'diaria' })
    setModal(null)
  }

  const toggleHabit = async (habit) => {
    const todayStr = today()
    const log = [...(habit.log || [])]
    const idx = log.indexOf(todayStr)
    if (idx >= 0) log.splice(idx, 1)
    else log.push(todayStr)
    await update(habit.id, { log })
  }

  const getStreak = (habit) => {
    let streak = 0; const d = new Date()
    while (true) {
      const ds = d.toISOString().split('T')[0]
      if ((habit.log || []).includes(ds)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak
  }

  const getLast7 = (habit) => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      days.push({ day: DAYS[d.getDay()], done: (habit.log || []).includes(ds) })
    }
    return days
  }

  return (
    <div>
      <Button color="var(--cyan)" onClick={() => setModal('habit')} style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}>+ Nuevo hábito</Button>

      {habits.map(h => {
        const streak = getStreak(h)
        const last7 = getLast7(h)
        const todayDone = (h.log || []).includes(today())
        return (
          <Card key={h.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{h.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Racha: <span style={{ color: streak > 0 ? 'var(--orange)' : 'var(--text-muted)', fontWeight: 700 }}>{streak} días</span></div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => toggleHabit(h)} style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: todayDone ? 'var(--cyan)' : 'var(--bg)',
                  border: `2px solid ${todayDone ? 'var(--cyan)' : 'var(--border)'}`,
                  color: todayDone ? '#000' : 'var(--text-muted)',
                  fontWeight: 800, fontSize: 14,
                }}>{todayDone ? '✓' : '+'}</button>
                <button onClick={() => remove(h.id)} style={{ color: 'var(--text-dim)' }}>🗑</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {last7.map((d, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 3 }}>{d.day}</div>
                  <div style={{
                    height: 24, borderRadius: 4,
                    background: d.done ? 'rgba(57,210,192,0.15)' : 'var(--bg)',
                    border: `1px solid ${d.done ? 'rgba(57,210,192,0.3)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{d.done && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)' }} />}</div>
                </div>
              ))}
            </div>
          </Card>
        )
      })}

      {modal === 'habit' && (
        <Modal title="Nuevo hábito" onClose={() => setModal(null)}>
          <Field label="Nombre"><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Meditar, leer, ejercicio..." /></Field>
          <Field label="Frecuencia"><select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}><option value="diaria">Diaria</option><option value="semanal">Semanal</option></select></Field>
          <Button color="var(--cyan)" onClick={handleAdd} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Crear hábito</Button>
        </Modal>
      )}
    </div>
  )
}

// ─── NOTES PANEL ───
function NotesPanel({ projects }) {
  const { profile } = useAuth()
  const [shared, setShared] = useState(false)
  const { data: notes, insert, update, remove } = useSupabaseData('notes', { orderBy: 'updated_at', ascending: false, showShared: shared })
  const [modal, setModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', project_id: '', tags: '' })

  const handleSave = async () => {
    if (!form.title) return
    const payload = {
      title: form.title, content: form.content,
      project_id: form.project_id || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      is_shared: shared, updated_at: new Date().toISOString(),
    }
    if (editing) await update(editing, payload)
    else await insert(payload)
    setForm({ title: '', content: '', project_id: '', tags: '' })
    setEditing(null); setModal(null)
  }

  return (
    <div>
      {profile?.partner_id && <SharedToggle shared={shared} onChange={setShared} />}
      <Button color="var(--pink)" onClick={() => { setEditing(null); setForm({ title: '', content: '', project_id: '', tags: '' }); setModal('note') }}
        style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}>+ Nueva nota</Button>

      {notes.map(n => {
        const proj = projects.find(p => p.id === n.project_id)
        return (
          <Card key={n.id} style={{ cursor: 'pointer' }} onClick={() => {
            setEditing(n.id)
            setForm({ title: n.title, content: n.content || '', project_id: n.project_id || '', tags: (n.tags || []).join(', ') })
            setModal('note')
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{n.title}</div>
              <button onClick={e => { e.stopPropagation(); remove(n.id) }} style={{ color: 'var(--text-dim)' }}>🗑</button>
            </div>
            {n.content && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{n.content}</div>}
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              {(n.tags || []).map(t => <Tag key={t} color="var(--pink)">{t}</Tag>)}
              {n.is_shared && <Tag color="var(--cyan)">👥</Tag>}
              {proj && <Tag color="var(--purple)">{proj.name}</Tag>}
            </div>
          </Card>
        )
      })}

      {modal === 'note' && (
        <Modal title={editing ? 'Editar nota' : 'Nueva nota'} onClose={() => { setModal(null); setEditing(null) }}>
          <Field label="Título"><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Mi idea..." /></Field>
          <Field label="Contenido"><textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} style={{ minHeight: 120, resize: 'vertical', lineHeight: 1.6 }} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Proyecto"><select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}><option value="">Sin proyecto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Tags (coma)"><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="idea, urgente" /></Field>
          </div>
          <Button color="var(--pink)" onClick={handleSave} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>Guardar</Button>
        </Modal>
      )}
    </div>
  )
}

// ─── DASHBOARD ───
function Dashboard({ setActiveTab }) {
  const { data: tasks } = useSupabaseData('tasks', { orderBy: 'due_date', ascending: true })
  const { data: projects } = useSupabaseData('projects')
  const { data: habits } = useSupabaseData('habits')
  const { data: transactions } = useSupabaseData('transactions', { orderBy: 'date', ascending: false })

  const todayTasks = tasks.filter(t => t.due_date === today() && !t.completed)
  const overdue = tasks.filter(t => t.due_date < today() && !t.completed)
  const pending = tasks.filter(t => !t.completed).length
  const activeProjects = projects.filter(p => p.status === 'activo')

  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthTx = transactions.filter(t => { const d = new Date(t.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear })
  const ingresos = monthTx.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
  const gastos = monthTx.filter(t => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Balance', val: formatCurrency(ingresos - gastos), color: ingresos - gastos >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Tareas', val: `${pending} pend.`, color: 'var(--accent)' },
          { label: 'Proyectos', val: `${activeProjects.length} act.`, color: 'var(--orange)' },
        ].map(s => (
          <Card key={s.label} style={{ padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.val}</div>
          </Card>
        ))}
      </div>

      {(todayTasks.length > 0 || overdue.length > 0) && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} /> Hoy
          </div>
          {overdue.slice(0, 3).map(t => (
            <div key={t.id} style={{ fontSize: 12, color: 'var(--red)', padding: '4px 0' }}>⚠ {t.title} <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>vencida</span></div>
          ))}
          {todayTasks.map(t => (
            <div key={t.id} style={{ fontSize: 12, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLORS[t.priority] }} />{t.title}
            </div>
          ))}
        </Card>
      )}

      {habits.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Hábitos de hoy</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {habits.map(h => {
              const done = (h.log || []).includes(today())
              return (
                <div key={h.id} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: done ? 'var(--cyan-dim)' : 'var(--bg)',
                  color: done ? 'var(--cyan)' : 'var(--text-muted)',
                  border: `1px solid ${done ? 'rgba(57,210,192,0.3)' : 'var(--border)'}`,
                }}>{done ? '✓ ' : ''}{h.name}</div>
              )
            })}
          </div>
        </Card>
      )}

      {activeProjects.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Proyectos activos</div>
          {activeProjects.map((p, i) => {
            const color = PROJECT_COLORS[projects.indexOf(p) % PROJECT_COLORS.length]
            const pTasks = tasks.filter(t => t.project_id === p.id)
            const done = pTasks.filter(t => t.completed).length
            const pct = pTasks.length > 0 ? ((done / pTasks.length) * 100).toFixed(0) : 0
            return (
              <div key={p.id} onClick={() => setActiveTab('projects')} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer',
                borderBottom: i < activeProjects.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ width: 4, height: 28, borderRadius: 2, background: color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ height: 3, background: 'var(--bg)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono'" }}>{pct}%</span>
              </div>
            )
          })}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Gasto rápido', color: 'var(--red)', tab: 'finances' },
          { label: 'Nueva tarea', color: 'var(--green)', tab: 'tasks' },
          { label: 'Nuevo proyecto', color: 'var(--orange)', tab: 'projects' },
          { label: 'Nueva nota', color: 'var(--pink)', tab: 'notes' },
        ].map(a => (
          <Card key={a.label} onClick={() => setActiveTab(a.tab)} style={{ cursor: 'pointer', padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{a.label}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN APP ───
function MainApp() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const { data: projects } = useSupabaseData('projects')

  const tabs = [
    { id: 'dashboard', label: 'Inicio', icon: '🧠' },
    { id: 'finances', label: 'Finanzas', icon: '💰' },
    { id: 'tasks', label: 'Tareas', icon: '✓' },
    { id: 'projects', label: 'Proyectos', icon: '📋' },
    { id: 'habits', label: 'Hábitos', icon: '⚡' },
    { id: 'notes', label: 'Notas', icon: '📝' },
    { id: 'settings', label: 'Config', icon: '⚙' },
  ]

  const renderPanel = () => {
    switch (activeTab) {
      case 'finances': return <FinancePanel projects={projects} />
      case 'tasks': return <TasksPanel projects={projects} />
      case 'projects': return <ProjectsPanel />
      case 'habits': return <HabitsPanel />
      case 'notes': return <NotesPanel projects={projects} />
      case 'settings': return <Settings />
      default: return <Dashboard setActiveTab={setActiveTab} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        padding: '16px 16px 0', position: 'sticky', top: 0, zIndex: 100,
        background: 'linear-gradient(to bottom, var(--bg) 80%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5, color: 'var(--accent)' }}>Segundo Cerebro</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              Hola, {profile?.display_name || 'Usuario'} · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 100px' }}>
        {renderPanel()}
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', padding: '6px 2px', paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '6px 2px', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-dim)',
            transition: 'color 0.15s', fontSize: 14,
          }}>
            <span>{t.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>🧠</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>Cargando...</div>
      </div>
    </div>
  )

  return user ? <MainApp /> : <AuthScreen />
}
