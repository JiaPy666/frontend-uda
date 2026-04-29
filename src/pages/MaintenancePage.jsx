import { useState, useEffect } from 'react'
import { API_BASE } from '../services/api'
import '../App.css'

const API = API_BASE

const ZONES = ['A', 'B', 'C', 'D']
const TYPES = ['Pulizia ordinaria', 'Controllo impianti', 'Riparazione segnaletica', 'Pulizia straordinaria', 'Ispezione sicurezza']
const OPERATORS = ['Mario Rossi', 'Luigi Verdi', 'Anna Bianchi', 'Carlo Neri', 'Sara Ferrari']
const STATUS_MAP = {
  programmato: { label: 'Programmato', bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  'in corso':   { label: 'In corso',   bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
  completato:   { label: 'Completato', bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  annullato:    { label: 'Annullato',  bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
}

function typeIcon(type) {
  if (type.includes('Pulizia')) return '🧹'
  if (type.includes('Controllo') || type.includes('Ispezione')) return '⚙️'
  if (type.includes('Riparazione')) return '🔨'
  return '🔧'
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP['programmato']
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:700,
      background: s.bg, color: s.color
    }}>
      <span style={{width:6,height:6,borderRadius:'50%',background:s.dot,display:'inline-block'}} />
      {s.label}
    </span>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background:'white', borderRadius:16, padding:'18px 22px',
      border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,0.04)',
      display:'flex', alignItems:'center', gap:16
    }}>
      <div style={{
        width:48, height:48, borderRadius:14, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize:22, background:`${color}18`, flexShrink:0
      }}>
        {icon}
      </div>
      <div>
        <div style={{fontSize:26,fontWeight:900,color:'#0f172a',lineHeight:1}}>{value}</div>
        <div style={{fontSize:13,color:'#64748b',marginTop:2}}>{label}</div>
      </div>
    </div>
  )
}

function AddTurnModal({ onClose, onAdd }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    zone: 'A', date: today, operator: OPERATORS[0],
    type: TYPES[0], notes: '', priority: 'normale'
  })
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    setForm(p => ({...p, [e.target.name]: e.target.value}))
  }

  async function handleSave() {
    if (!form.date || !form.operator) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    onAdd({
      id: Date.now(),
      ...form,
      date: new Date(form.date).toLocaleDateString('it-IT'),
      date_iso: form.date,
      status: 'programmato'
    })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'white',borderRadius:24,padding:32,width:'100%',maxWidth:520,
        boxShadow:'0 24px 64px rgba(0,0,0,0.18)',border:'1px solid #e2e8f0'
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:800,color:'#0f172a',margin:0}}>🔧 Nuovo turno manutenzione</h2>
            <p style={{color:'#64748b',fontSize:13,margin:'4px 0 0'}}>Pianifica un intervento al parcheggio</p>
          </div>
          <button onClick={onClose} style={{padding:'8px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontSize:16,color:'#64748b'}}>✕</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* Zona */}
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:700,color:'#64748b',letterSpacing:'0.04em'}}>ZONA</span>
            <div style={{display:'flex',gap:8}}>
              {ZONES.map(z => (
                <button key={z} onClick={()=>setForm(p=>({...p,zone:z}))}
                  style={{flex:1,padding:'10px 0',borderRadius:10,border:`2px solid ${form.zone===z?'#2563eb':'#e2e8f0'}`,
                    background:form.zone===z?'#eff6ff':'white',color:form.zone===z?'#2563eb':'#64748b',
                    fontWeight:800,fontSize:15,cursor:'pointer',transition:'all 0.15s'}}>
                  {z}
                </button>
              ))}
            </div>
          </label>

          {/* Data */}
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:700,color:'#64748b',letterSpacing:'0.04em'}}>DATA</span>
            <input type="date" name="date" value={form.date} onChange={handleChange}
              style={{padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:14,fontFamily:'inherit'}} />
          </label>

          {/* Tipo intervento */}
          <label style={{display:'flex',flexDirection:'column',gap:6,gridColumn:'1/-1'}}>
            <span style={{fontSize:12,fontWeight:700,color:'#64748b',letterSpacing:'0.04em'}}>TIPO INTERVENTO</span>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {TYPES.map(t => (
                <button key={t} onClick={()=>setForm(p=>({...p,type:t}))}
                  style={{padding:'7px 14px',borderRadius:20,border:`1px solid ${form.type===t?'#2563eb':'#e2e8f0'}`,
                    background:form.type===t?'#eff6ff':'white',color:form.type===t?'#2563eb':'#64748b',
                    fontWeight:600,fontSize:13,cursor:'pointer',transition:'all 0.15s'}}>
                  {typeIcon(t)} {t}
                </button>
              ))}
            </div>
          </label>

          {/* Operatore */}
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:700,color:'#64748b',letterSpacing:'0.04em'}}>OPERATORE</span>
            <select name="operator" value={form.operator} onChange={handleChange}
              style={{padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:14,fontFamily:'inherit',background:'white'}}>
              {OPERATORS.map(o => <option key={o}>{o}</option>)}
            </select>
          </label>

          {/* Priorità */}
          <label style={{display:'flex',flexDirection:'column',gap:6}}>
            <span style={{fontSize:12,fontWeight:700,color:'#64748b',letterSpacing:'0.04em'}}>PRIORITÀ</span>
            <select name="priority" value={form.priority} onChange={handleChange}
              style={{padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:14,fontFamily:'inherit',background:'white'}}>
              <option value="bassa">🟢 Bassa</option>
              <option value="normale">🟡 Normale</option>
              <option value="alta">🔴 Alta</option>
            </select>
          </label>

          {/* Note */}
          <label style={{display:'flex',flexDirection:'column',gap:6,gridColumn:'1/-1'}}>
            <span style={{fontSize:12,fontWeight:700,color:'#64748b',letterSpacing:'0.04em'}}>NOTE (opzionale)</span>
            <textarea name="notes" value={form.notes} onChange={handleChange}
              placeholder="Dettagli aggiuntivi sull'intervento..."
              rows={3}
              style={{padding:'10px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:14,fontFamily:'inherit',resize:'vertical'}} />
          </label>
        </div>

        <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:24,paddingTop:20,borderTop:'1px solid #f1f5f9'}}>
          <button onClick={onClose} style={{padding:'10px 20px',borderRadius:12,border:'1px solid #e2e8f0',background:'white',cursor:'pointer',fontWeight:600,fontSize:14,color:'#64748b'}}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving || !form.date || !form.operator}
            style={{padding:'10px 24px',borderRadius:12,border:'none',
              background: saving ? '#94a3b8' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color:'white',fontWeight:700,fontSize:14,cursor:saving?'not-allowed':'pointer',
              boxShadow:'0 2px 12px rgba(37,99,235,0.3)'}}>
            {saving ? '⏳ Salvataggio…' : '✅ Aggiungi turno'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MaintenancePage() {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterZone, setFilterZone] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    fetch(`${API}/maintenance/schedule`)
      .then(r => r.json())
      .then(data => { setSchedule(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => {
        // Dati demo
        const today = new Date()
        setSchedule([
          { id:1, zone:'A', date:'Oggi', date_iso: today.toISOString().split('T')[0], operator:'Mario Rossi', type:'Pulizia ordinaria', status:'in corso', priority:'normale', notes:'Settore nord' },
          { id:2, zone:'B', date:'Domani', date_iso:'', operator:'Luigi Verdi', type:'Controllo impianti', status:'programmato', priority:'alta', notes:'Revisione luci' },
          { id:3, zone:'C', date:'Ieri', date_iso:'', operator:'Anna Bianchi', type:'Riparazione segnaletica', status:'completato', priority:'bassa', notes:'' },
          { id:4, zone:'D', date:'31/05/2025', date_iso:'', operator:'Carlo Neri', type:'Pulizia straordinaria', status:'programmato', priority:'normale', notes:'' },
          { id:5, zone:'A', date:'28/05/2025', date_iso:'', operator:'Sara Ferrari', type:'Ispezione sicurezza', status:'annullato', priority:'alta', notes:'Rinviato' },
        ])
        setLoading(false)
      })
  }, [])

  function showNotif(msg, type='success') {
    setNotification({msg, type})
    setTimeout(() => setNotification(null), 4000)
  }

  function handleAdd(entry) {
    setSchedule(prev => [entry, ...prev])
    showNotif('✅ Turno aggiunto con successo!')
  }

  function handleDelete(id) {
    if (!confirm('Rimuovere questo turno?')) return
    setSchedule(prev => prev.filter(s => s.id !== id))
    showNotif('🗑 Turno rimosso')
  }

  function handleStatusChange(id, newStatus) {
    setSchedule(prev => prev.map(s => s.id === id ? {...s, status: newStatus} : s))
  }

  const filtered = schedule.filter(s => {
    if (filterZone !== 'all' && s.zone !== filterZone) return false
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: schedule.length,
    programmato: schedule.filter(s=>s.status==='programmato').length,
    inCorso: schedule.filter(s=>s.status==='in corso').length,
    completato: schedule.filter(s=>s.status==='completato').length,
  }

  return (
    <div style={{padding:'28px 32px',minHeight:'100vh',background:'#f1f5f9'}}>
      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div>
            <p style={{fontSize:12,fontWeight:700,color:'#2563eb',letterSpacing:'0.08em',margin:'0 0 6px'}}>GESTIONE PARCHEGGIO</p>
            <h1 style={{fontSize:28,fontWeight:900,color:'#0f172a',margin:'0 0 6px'}}>🔧 Turni Manutenzione</h1>
            <p style={{color:'#64748b',fontSize:15,margin:0}}>Pianifica e monitora gli interventi alle zone del parcheggio</p>
          </div>
          <button onClick={() => setShowAddModal(true)} style={{
            padding:'12px 24px',borderRadius:14,border:'none',
            background:'linear-gradient(135deg,#2563eb,#1d4ed8)',
            color:'white',fontWeight:700,fontSize:15,cursor:'pointer',
            boxShadow:'0 4px 16px rgba(37,99,235,0.35)',
            display:'flex',alignItems:'center',gap:8,transition:'transform 0.15s'
          }}>
            <span style={{fontSize:18}}>+</span> Nuovo turno
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        <StatCard icon="📋" label="Totale turni" value={stats.total} color="#2563eb" />
        <StatCard icon="⏳" label="Programmati" value={stats.programmato} color="#3b82f6" />
        <StatCard icon="⚙️" label="In corso" value={stats.inCorso} color="#eab308" />
        <StatCard icon="✅" label="Completati" value={stats.completato} color="#22c55e" />
      </div>

      {/* Filters + Table */}
      <div style={{background:'white',borderRadius:20,border:'1px solid #e2e8f0',boxShadow:'0 2px 16px rgba(0,0,0,0.04)',overflow:'hidden'}}>
        {/* Toolbar */}
        <div style={{padding:'18px 24px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontWeight:700,fontSize:15,color:'#0f172a',marginRight:4}}>Filtri:</span>
          {/* Zone filter */}
          <div style={{display:'flex',gap:6}}>
            {[{v:'all',l:'Tutte le zone'}, ...ZONES.map(z=>({v:z,l:`Zona ${z}`}))].map(({v,l}) => (
              <button key={v} onClick={()=>setFilterZone(v)} style={{
                padding:'6px 14px',borderRadius:20,border:`1px solid ${filterZone===v?'#2563eb':'#e2e8f0'}`,
                background:filterZone===v?'#eff6ff':'white',
                color:filterZone===v?'#2563eb':'#64748b',
                fontWeight:600,fontSize:13,cursor:'pointer',transition:'all 0.15s'
              }}>{l}</button>
            ))}
          </div>
          <div style={{width:1,height:28,background:'#e2e8f0',margin:'0 4px'}} />
          {/* Status filter */}
          <div style={{display:'flex',gap:6}}>
            {[{v:'all',l:'Tutti'},{v:'programmato',l:'Programmati'},{v:'in corso',l:'In corso'},{v:'completato',l:'Completati'}].map(({v,l}) => (
              <button key={v} onClick={()=>setFilterStatus(v)} style={{
                padding:'6px 14px',borderRadius:20,border:`1px solid ${filterStatus===v?'#7c3aed':'#e2e8f0'}`,
                background:filterStatus===v?'#f5f3ff':'white',
                color:filterStatus===v?'#7c3aed':'#64748b',
                fontWeight:600,fontSize:13,cursor:'pointer',transition:'all 0.15s'
              }}>{l}</button>
            ))}
          </div>
          <span style={{marginLeft:'auto',fontSize:13,color:'#94a3b8'}}>{filtered.length} risultati</span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:40,marginBottom:12}}>⏳</div>
            <p>Caricamento turni…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:'#94a3b8'}}>
            <div style={{fontSize:40,marginBottom:12}}>🔧</div>
            <p>Nessun turno trovato.<br/>Clicca <strong>Nuovo turno</strong> per pianificarne uno.</p>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['Tipo','Zona','Data','Operatore','Priorità','Stato','Azioni'].map(h => (
                  <th key={h} style={{padding:'12px 20px',textAlign:'left',fontSize:11,fontWeight:700,color:'#94a3b8',letterSpacing:'0.06em',borderBottom:'1px solid #f1f5f9'}}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{
                  borderBottom: i < filtered.length-1 ? '1px solid #f8fafc' : 'none',
                  transition:'background 0.15s'
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}
                >
                  {/* Tipo */}
                  <td style={{padding:'14px 20px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:36,height:36,borderRadius:10,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                        {typeIcon(s.type)}
                      </div>
                      <div>
                        <div style={{fontWeight:700,color:'#0f172a',fontSize:14}}>{s.type}</div>
                        {s.notes && <div style={{color:'#94a3b8',fontSize:12,marginTop:1}}>{s.notes}</div>}
                      </div>
                    </div>
                  </td>
                  {/* Zona */}
                  <td style={{padding:'14px 20px'}}>
                    <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',
                      width:32,height:32,borderRadius:10,background:'#1e3a8a',color:'white',fontWeight:900,fontSize:15}}>
                      {s.zone}
                    </span>
                  </td>
                  {/* Data */}
                  <td style={{padding:'14px 20px',fontSize:14,fontWeight:600,color:'#334155'}}>
                    📅 {s.date}
                  </td>
                  {/* Operatore */}
                  <td style={{padding:'14px 20px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#2563eb,#7c3aed)',
                        color:'white',fontWeight:700,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {s.operator?.charAt(0) || '?'}
                      </div>
                      <span style={{fontSize:14,color:'#334155'}}>{s.operator}</span>
                    </div>
                  </td>
                  {/* Priorità */}
                  <td style={{padding:'14px 20px'}}>
                    <span style={{fontSize:13,fontWeight:600,color:
                      s.priority==='alta'?'#ef4444':s.priority==='normale'?'#eab308':'#22c55e'}}>
                      {s.priority==='alta'?'🔴 Alta':s.priority==='bassa'?'🟢 Bassa':'🟡 Normale'}
                    </span>
                  </td>
                  {/* Stato */}
                  <td style={{padding:'14px 20px'}}>
                    <select value={s.status} onChange={e=>handleStatusChange(s.id, e.target.value)}
                      style={{padding:'5px 10px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13,
                        background:'white',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                      {Object.keys(STATUS_MAP).map(st => (
                        <option key={st} value={st}>{STATUS_MAP[st].label}</option>
                      ))}
                    </select>
                  </td>
                  {/* Azioni */}
                  <td style={{padding:'14px 20px'}}>
                    <button onClick={()=>handleDelete(s.id)}
                      style={{padding:'6px 12px',borderRadius:8,border:'1px solid #fecaca',
                        background:'#fef2f2',color:'#ef4444',fontWeight:600,fontSize:13,cursor:'pointer'}}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showAddModal && <AddTurnModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}

      {/* Toast */}
      {notification && (
        <div style={{
          position:'fixed',bottom:28,right:28,zIndex:9999,
          padding:'14px 22px',borderRadius:14,fontWeight:700,fontSize:14,
          background: notification.type==='error' ? '#fef2f2' : '#f0fdf4',
          color: notification.type==='error' ? '#dc2626' : '#166534',
          border: `1px solid ${notification.type==='error'?'#fecaca':'#bbf7d0'}`,
          boxShadow:'0 8px 32px rgba(0,0,0,0.12)'
        }}>
          {notification.msg}
        </div>
      )}
    </div>
  )
}
