import { useState, useEffect } from 'react'
import { API_BASE } from '../services/api'

const API = API_BASE

// Status devono corrispondere esattamente al DB (aperta/in lavorazione/risolta)
const STATUS_MAP = {
  'aperta':         { label: 'Aperta',         bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  'in lavorazione': { label: 'In lavorazione', bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
  'risolta':        { label: 'Risolta',        bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
}

const TYPE_ICON = {
  'Sporco/Rifiuti':             '🗑',
  'Segnaletica danneggiata':    '🪧',
  'Illuminazione guasta':       '💡',
  'Pavimentazione danneggiata': '🛣',
  'Altro':                      '⚠️',
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:99, fontSize:12, fontWeight:700, background:s.bg, color:s.color }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, display:'inline-block' }} />
      {s.label}
    </span>
  )
}

export default function FaultReportsPage() {
  const [reports, setReports]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [notification, setNotification] = useState(null)

  function showNotif(msg, type = 'success') {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  function loadReports() {
    fetch(`${API}/faults`)          // ← endpoint corretto
      .then(r => r.json())
      .then(d => { setReports(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadReports() }, [])

  async function handleStatusChange(id, newStatus) {
    // Ottimistic UI
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    try {
      const res = await fetch(`${API}/faults/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        showNotif(newStatus === 'risolta'
          ? '✅ Segnalazione risolta! Posto rimesso in servizio.'
          : '🔄 Stato aggiornato')
        loadReports() // ricarica dal DB
      } else {
        showNotif('❌ Errore aggiornamento', 'error')
        loadReports()
      }
    } catch {
      showNotif('❌ Errore di rete', 'error')
    }
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)

  const stats = {
    aperta:          reports.filter(r => r.status === 'aperta').length,
    in_lavorazione:  reports.filter(r => r.status === 'in lavorazione').length,
    risolta:         reports.filter(r => r.status === 'risolta').length,
  }

  return (
    <div style={{ padding:'28px 32px', minHeight:'100vh', background:'#f1f5f9' }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#ef4444', letterSpacing:'0.08em', margin:'0 0 6px' }}>
          GESTIONE PARCHEGGIO
        </p>
        <h1 style={{ fontSize:28, fontWeight:900, color:'#0f172a', margin:'0 0 6px' }}>
          ⚠️ Segnalazioni Guasto
        </h1>
        <p style={{ color:'#64748b', fontSize:15, margin:0 }}>
          Segnalazioni inviate dagli utenti — gestisci e risolvi i problemi
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { icon:'📋', label:'Totali',         value: reports.length,        color:'#2563eb' },
          { icon:'🔴', label:'Aperte',          value: stats.aperta,          color:'#ef4444' },
          { icon:'🟡', label:'In lavorazione',  value: stats.in_lavorazione,  color:'#eab308' },
          { icon:'🟢', label:'Risolte',         value: stats.risolta,         color:'#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background:'white', borderRadius:16, padding:'18px 22px',
            border:'1px solid #e2e8f0', boxShadow:'0 2px 12px rgba(0,0,0,0.04)',
            display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:`${s.color}18`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize:28, fontWeight:900, color:'#0f172a', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'white', borderRadius:20, border:'1px solid #e2e8f0',
        boxShadow:'0 2px 16px rgba(0,0,0,0.04)', overflow:'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f1f5f9',
          display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontWeight:700, fontSize:14, color:'#0f172a', marginRight:4 }}>Filtra:</span>
          {[
            { v:'all',            l:'Tutte' },
            { v:'aperta',         l:'🔴 Aperte' },
            { v:'in lavorazione', l:'🟡 In lavorazione' },
            { v:'risolta',        l:'🟢 Risolte' },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding:'6px 14px', borderRadius:20,
              border:`1px solid ${filter === v ? '#2563eb' : '#e2e8f0'}`,
              background: filter === v ? '#eff6ff' : 'white',
              color: filter === v ? '#2563eb' : '#64748b',
              fontWeight:600, fontSize:13, cursor:'pointer', transition:'all 0.15s'
            }}>{l}</button>
          ))}
          <button onClick={loadReports} style={{ marginLeft:'auto', padding:'6px 14px',
            borderRadius:20, border:'1px solid #e2e8f0', background:'white',
            color:'#64748b', fontSize:13, cursor:'pointer', fontWeight:600 }}>
            🔄 Aggiorna
          </button>
          <span style={{ fontSize:13, color:'#94a3b8' }}>{filtered.length} segnalazioni</span>
        </div>

        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>
            <p>Caricamento segnalazioni…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
            <p>Nessuna segnalazione{filter !== 'all' ? ' in questa categoria' : ''}.<br />
              Il parcheggio è in perfette condizioni!</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Posto','Zona','Tipo problema','Descrizione','Segnalato da','Data','Stato','Azioni'].map(h => (
                  <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11,
                    fontWeight:700, color:'#94a3b8', letterSpacing:'0.06em',
                    borderBottom:'1px solid #f1f5f9' }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}
                  style={{ borderBottom: i < filtered.length-1 ? '1px solid #f8fafc' : 'none', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  {/* Posto */}
                  <td style={{ padding:'14px 20px' }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>{r.spot_id}</div>
                  </td>
                  {/* Zona */}
                  <td style={{ padding:'14px 20px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                      width:32, height:32, borderRadius:10, background:'#1e3a8a',
                      color:'white', fontWeight:900, fontSize:15 }}>
                      {r.zone || '?'}
                    </span>
                  </td>
                  {/* Tipo */}
                  <td style={{ padding:'14px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>{TYPE_ICON[r.report_type] || '⚠️'}</span>
                      <span style={{ fontWeight:700, color:'#0f172a', fontSize:13 }}>{r.report_type}</span>
                    </div>
                  </td>
                  {/* Descrizione */}
                  <td style={{ padding:'14px 20px', maxWidth:200 }}>
                    <div style={{ color:'#64748b', fontSize:13, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {r.description || <em style={{ color:'#cbd5e1' }}>nessuna nota</em>}
                    </div>
                  </td>
                  {/* Utente */}
                  <td style={{ padding:'14px 20px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%',
                        background:'linear-gradient(135deg,#64748b,#94a3b8)',
                        color:'white', fontWeight:700, fontSize:12, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {(r.user_name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize:13, color:'#334155' }}>{r.user_name || 'Anonimo'}</span>
                    </div>
                  </td>
                  {/* Data */}
                  <td style={{ padding:'14px 20px', fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>
                    📅 {r.created_at}
                  </td>
                  {/* Stato */}
                  <td style={{ padding:'14px 20px' }}>
                    <StatusBadge status={r.status} />
                  </td>
                  {/* Azioni */}
                  <td style={{ padding:'14px 20px' }}>
                    {r.status !== 'risolta' ? (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {r.status === 'aperta' && (
                          <button onClick={() => handleStatusChange(r.id, 'in lavorazione')}
                            style={{ padding:'5px 10px', borderRadius:8,
                              border:'1px solid #fde68a', background:'#fefce8',
                              color:'#854d0e', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                            🔧 Prendi in carico
                          </button>
                        )}
                        <button onClick={() => handleStatusChange(r.id, 'risolta')}
                          style={{ padding:'5px 10px', borderRadius:8,
                            border:'1px solid #bbf7d0', background:'#f0fdf4',
                            color:'#166534', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                          ✅ Risolto
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize:12, color:'#94a3b8' }}>
                        {r.resolved_at ? `Risolta: ${r.resolved_at}` : 'Risolta'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Toast */}
      {notification && (
        <div style={{ position:'fixed', bottom:28, right:28, zIndex:9999,
          padding:'14px 22px', borderRadius:14, fontWeight:700, fontSize:14,
          background: notification.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: notification.type === 'error' ? '#dc2626' : '#166534',
          border:`1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }}>
          {notification.msg}
        </div>
      )}
    </div>
  )
}
