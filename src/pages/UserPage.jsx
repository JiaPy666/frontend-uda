import { useState, useEffect, useMemo, useRef } from 'react'
import ParkingMapView from '../components/ParkingMapView'
import '../App.css'
import './UserPage.css'
import { API_BASE as API } from '../services/api'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatType(type) {
  const map = { normal: 'Normale', disabled: 'Disabili', electric: 'Elettrico', motorcycle: 'Moto', van: 'Van' }
  return map[type] || type
}

function getVehicleIcon(parking_type) {
  if (parking_type === 'motorcycle') return '🏍️'
  if (parking_type === 'van') return '🚐'
  if (parking_type === 'electric') return '⚡'
  if (parking_type === 'disabled') return '♿'
  return '🚗'
}

function getBadgeClass(spot) {
  if (spot.maintenance) return 'status-warning'
  if (spot.status === 'occupied') return 'status-danger'
  switch (spot.parking_type) {
    case 'disabled': return 'status-info'
    case 'electric': return 'status-success'
    default: return 'status-success'
  }
}

function formatDuration(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function co2Saved(floorLevel) {
  const base = 5
  const saved = (floorLevel - 1) * 5
  return saved
}

// ─── PDF Generator ──────────────────────────────────────────────────────────

async function generateBookingPDF(booking, user) {
  const { jsPDF } = await import('jspdf')
  const QRCode = await import('qrcode')
  const doc = new jsPDF()
  const bookingCode = booking.booking_code || booking.code
  const qrData = [
    `Codice: ${bookingCode}`,
    `Posto: ${booking.spot_id || booking.spotId || ''}`,
    `Zona: ${booking.zone}`,
    `Intestatario: ${user.name}`,
    `Targa: ${user.plate || 'N/D'}`,
    `Inizio: ${booking.start_time || booking.startTime}`,
    `Fine: ${booking.end_time || booking.endTime}`,
  ].join(' | ')
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold')
  doc.text('Prenotazione Parcheggio', 14, 18)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal')
  doc.text('Aeroporto UDA — Biglietto di prenotazione', 14, 30)
  doc.setFillColor(37, 99, 235); doc.roundedRect(14, 48, 182, 22, 4, 4, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text(`Codice: ${bookingCode}`, 105, 63, { align: 'center' })
  doc.setTextColor(15, 23, 42); doc.setFontSize(11)
  const rows = [
    ['Intestatario', user.name],
    ['Email', user.email],
    ['Targa', user.plate || 'N/D'],
    ['Posto', booking.spot_id || booking.spotId || ''],
    ['Zona', `Zona ${booking.zone}`],
    ['Tipo', formatType(booking.parking_type || booking.type)],
    ['Costo orario', `€ ${booking.hourly_cost || booking.cost}/ora`],
    ['Inizio', booking.start_time || booking.startTime],
    ['Fine', booking.end_time || booking.endTime],
    ['Durata', (booking.duration_hours || booking.duration) + ' ore'],
    ['Totale', `€ ${Number(booking.total_cost || (booking.cost * booking.duration)).toFixed(2)}`],
  ]
  let y = 82
  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) { doc.setFillColor(248, 251, 255); doc.rect(14, y - 5, 120, 12, 'F') }
    doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139); doc.text(label, 18, y + 3)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42); doc.text(String(value), 62, y + 3)
    y += 13
  })
  const qrX = 142, qrY = 80, qrSize = 55
  doc.setFillColor(248, 251, 255); doc.setDrawColor(219, 228, 240)
  doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 18, 4, 4, 'FD')
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139)
  doc.text('Scansiona per verificare', qrX + qrSize / 2, qrY + qrSize + 9, { align: 'center' })
  doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text(bookingCode, qrX + qrSize / 2, qrY + qrSize + 14, { align: 'center' })
  doc.setFillColor(248, 251, 255); doc.rect(0, 270, 210, 27, 'F')
  doc.setFontSize(9); doc.setTextColor(100, 116, 139)
  doc.text('Questo documento è il tuo titolo di accesso al parcheggio. Conservalo.', 105, 282, { align: 'center' })
  doc.text(`Generato il ${new Date().toLocaleString('it-IT')}`, 105, 290, { align: 'center' })
  doc.save(`prenotazione-${bookingCode}.pdf`)
}

// ─── Countdown Hook ──────────────────────────────────────────────────────────

function useCountdown(endTime) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!endTime) return
    const tick = () => setRemaining(Math.max(0, new Date(endTime) - new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTime])
  return remaining
}

// ─── Visit Chart Component ───────────────────────────────────────────────────

function VisitChart({ darkMode }) {
  const [stats, setStats] = useState(null)
  const [view, setView] = useState('hourly') // 'hourly' | 'weekly'
  const [selectedDay, setSelectedDay] = useState('Mer')
  const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

  useEffect(() => {
    fetch(`${API}/stats/visits`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({
        hourly: Array.from({length:24},(_,h)=>({hour:h,count:Math.max(0,Math.floor(8*Math.abs(Math.sin(h/3.8))+(h>=8&&h<=10?12:h>=14&&h<=16?8:3)))})),
        weekly: [{day:'Lun',count:12},{day:'Mar',count:18},{day:'Mer',count:25},{day:'Gio',count:20},{day:'Ven',count:30},{day:'Sab',count:45},{day:'Dom',count:38}]
      }))
  }, [])

  if (!stats) return <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>⏳ Caricamento grafico…</div>

  const data = view === 'hourly' ? stats.hourly : stats.weekly
  const maxVal = Math.max(...data.map(d => d.count), 1)

  const currentHour = new Date().getHours()
  const currentDow = new Date().getDay() // 0=sun
  const dowMap = {0:6,1:0,2:1,3:2,4:3,5:4,6:5}

  return (
    <div style={{background: darkMode ? '#1e293b' : '#f8fafc', borderRadius:16, padding:24, border:`1px solid ${darkMode?'#334155':'#e2e8f0'}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h3 style={{fontWeight:800,fontSize:18,color:darkMode?'#f1f5f9':'#0f172a',margin:0}}>
            📊 Orari con il maggior numero di visite
          </h3>
          <p style={{color:'var(--muted)',fontSize:13,margin:'4px 0 0'}}>
            {view === 'hourly' ? 'Distribuzione per ora del giorno' : 'Distribuzione per giorno della settimana'}
          </p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setView('hourly')}
            style={{padding:'7px 16px',borderRadius:20,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
              background:view==='hourly'?'#2563eb':'transparent',color:view==='hourly'?'#fff':darkMode?'#94a3b8':'#64748b'}}>
            Per ora
          </button>
          <button onClick={()=>setView('weekly')}
            style={{padding:'7px 16px',borderRadius:20,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
              background:view==='weekly'?'#2563eb':'transparent',color:view==='weekly'?'#fff':darkMode?'#94a3b8':'#64748b'}}>
            Per giorno
          </button>
        </div>
      </div>

      {view === 'hourly' && (
        <div style={{display:'flex',gap:2,alignItems:'flex-end',height:120,padding:'0 4px',overflowX:'auto'}}>
          {stats.hourly.map((item, i) => {
            const h = item.hour
            const isNow = h === currentHour
            const pct = item.count / maxVal
            return (
              <div key={h} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,flex:'1 0 auto',minWidth:22}}>
                <div style={{
                  width:'100%', minWidth:18,
                  height: Math.max(4, pct * 96) + 'px',
                  background: isNow ? '#ef4444' : item.count > maxVal*0.7 ? '#2563eb' : '#93c5fd',
                  borderRadius:'4px 4px 0 0',
                  transition:'height 0.4s ease',
                  cursor:'pointer',
                  position:'relative'
                }} title={`${h}:00 — ${item.count} prenotazioni`}>
                  {isNow && <div style={{position:'absolute',top:-20,left:'50%',transform:'translateX(-50%)',fontSize:8,fontWeight:700,color:'#ef4444',whiteSpace:'nowrap'}}>ora</div>}
                </div>
                {(h % 3 === 0) && <span style={{fontSize:9,color:'var(--muted)',whiteSpace:'nowrap'}}>{h}</span>}
              </div>
            )
          })}
        </div>
      )}

      {view === 'weekly' && (
        <div style={{display:'flex',gap:10,alignItems:'flex-end',height:120}}>
          {stats.weekly.map((item, i) => {
            const isToday = i === (dowMap[new Date().getDay()] ?? -1)
            const pct = item.count / maxVal
            return (
              <div key={item.day} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                <span style={{fontSize:11,fontWeight:700,color:darkMode?'#94a3b8':'#64748b'}}>{item.count}</span>
                <div style={{
                  width:'100%',
                  height: Math.max(4, pct * 88) + 'px',
                  background: isToday ? '#ef4444' : '#2563eb',
                  borderRadius:'6px 6px 0 0',
                  transition:'height 0.5s ease'
                }} title={`${item.day} — ${item.count} prenotazioni`} />
                <span style={{fontSize:12,fontWeight:isToday?800:600,color:isToday?'#ef4444':darkMode?'#94a3b8':'#64748b'}}>{item.day}</span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{marginTop:16,padding:'10px 14px',background:darkMode?'#0f172a':'#eff6ff',borderRadius:10,fontSize:13,color:'#2563eb'}}>
        💡 {view === 'hourly'
          ? `Ora di punta: ${stats.hourly.reduce((a,b)=>a.count>b.count?a:b).hour}:00 — considera di prenotare in anticipo!`
          : `Giorno più affollato: ${stats.weekly.reduce((a,b)=>a.count>b.count?a:b).day}`
        }
      </div>
    </div>
  )
}

// ─── Leaflet Map Component ───────────────────────────────────────────────────

function ParkingLocationMap({ darkMode }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (mapInstanceRef.current) return
    // Carica Leaflet dinamicamente
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = () => {
      if (!mapRef.current || mapInstanceRef.current) return
      const L = window.L
      // Coordinate parcheggi Piazza Vittoria
      const lat = 45.537936, lng = 10.218876
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 16)
      mapInstanceRef.current = map

      const tileUrl = darkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

      L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)

      // Icona personalizzata
      const icon = L.divIcon({
        html: '<div style="background:#2563eb;width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:18px">🅿</span></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        className: ''
      })

      const marker = L.marker([lat, lng], { icon }).addTo(map)
      marker.bindPopup(`
        <div style="font-family:system-ui;padding:8px;min-width:200px">
          <strong style="font-size:15px">🅿</strong><br>
          <span style="color:#64748b;font-size:13px">Parcheggio Piazza Vittoria</span><br>
          <hr style="margin:8px 0;border:none;border-top:1px solid #e2e8f0">
          <span style="color:#2563eb;font-size:13px">📍 Piazza Vittoria, Brescia</span><br>
          <span style="font-size:12px;color:#64748b">⏰ Aperto 24h/24</span>
        </div>
      `).openPopup()

      // Cerchio raggio
      L.circle([lat, lng], { color: '#2563eb', fillColor: '#bfdbfe', fillOpacity: 0.2, radius: 200 }).addTo(map)
    }
    document.head.appendChild(script)
  }, [])

  return (
    <div style={{borderRadius:16,overflow:'hidden',border:'1px solid var(--border-color)',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
      <div style={{padding:'16px 20px',background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'white',display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:24}}>📍</span>
        <div>
          <div style={{fontWeight:700,fontSize:16}}>Posizione Parcheggio</div>
          <div style={{fontSize:13,opacity:0.8}}>Parcheggio Piazza Vittoria</div>
        </div>
      </div>
      <div ref={mapRef} style={{height:320,width:'100%'}} />
    </div>
  )
}

// ─── Maintenance Schedule ─────────────────────────────────────────────────────

function MaintenanceSchedule({ darkMode }) {
  const [schedule, setSchedule] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ zone: 'A', date: '', operator: '', type: 'Pulizia ordinaria' })

  useEffect(() => {
    fetch(`${API}/maintenance/schedule`)
      .then(r => r.json())
      .then(setSchedule)
      .catch(() => setSchedule([]))
  }, [])

  function handleAdd() {
    if (!form.date || !form.operator) return
    const newEntry = {
      id: Date.now(),
      ...form,
      date: new Date(form.date).toLocaleDateString('it-IT'),
      status: 'programmato'
    }
    setSchedule(prev => [...prev, newEntry])
    setShowForm(false)
    setForm({ zone: 'A', date: '', operator: '', type: 'Pulizia ordinaria' })
  }

  const cardBg = darkMode ? '#1e293b' : '#f8fafc'
  const border = darkMode ? '#334155' : '#e2e8f0'
  const text = darkMode ? '#f1f5f9' : '#0f172a'

  return (
    <div style={{background:cardBg,borderRadius:16,padding:24,border:`1px solid ${border}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h3 style={{fontWeight:800,fontSize:18,color:text,margin:0}}>🔧 Turni Manutenzione</h3>
          <p style={{color:'var(--muted)',fontSize:13,margin:'4px 0 0'}}>Calendario lavori programmati</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          style={{padding:'8px 16px',borderRadius:10,border:'none',background:'#2563eb',color:'white',fontWeight:700,cursor:'pointer',fontSize:13}}>
          {showForm ? '✕ Chiudi' : '+ Aggiungi turno'}
        </button>
      </div>

      {showForm && (
        <div style={{background:darkMode?'#0f172a':'#eff6ff',borderRadius:12,padding:20,marginBottom:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            {label:'Zona',name:'zone',type:'select',opts:['A','B','C','D']},
            {label:'Data',name:'date',type:'date'},
            {label:'Operatore',name:'operator',type:'text'},
            {label:'Tipo intervento',name:'type',type:'select',opts:['Pulizia ordinaria','Controllo impianti','Riparazione segnaletica','Pulizia straordinaria']},
          ].map(f => (
            <label key={f.name} style={{display:'flex',flexDirection:'column',gap:4}}>
              <span style={{fontSize:12,fontWeight:600,color:'var(--muted)'}}>{f.label}</span>
              {f.type === 'select'
                ? <select value={form[f.name]} onChange={e=>setForm(p=>({...p,[f.name]:e.target.value}))}
                    style={{padding:'8px 12px',borderRadius:8,border:'1px solid var(--border-color)',fontSize:14}}>
                    {f.opts.map(o=><option key={o}>{o}</option>)}
                  </select>
                : <input type={f.type} value={form[f.name]} onChange={e=>setForm(p=>({...p,[f.name]:e.target.value}))}
                    style={{padding:'8px 12px',borderRadius:8,border:'1px solid var(--border-color)',fontSize:14}} />
              }
            </label>
          ))}
          <div style={{gridColumn:'1/-1',display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={() => setShowForm(false)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border-color)',background:'transparent',cursor:'pointer',fontWeight:600}}>Annulla</button>
            <button onClick={handleAdd} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#2563eb',color:'white',fontWeight:700,cursor:'pointer'}}>Salva turno</button>
          </div>
        </div>
      )}

      <div style={{display:'grid',gap:10}}>
        {schedule.map(s => (
          <div key={s.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:darkMode?'#0f172a':'white',borderRadius:12,border:`1px solid ${border}`}}>
            <div style={{width:44,height:44,borderRadius:12,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
              {s.type.includes('Pulizia') ? '🧹' : s.type.includes('Controllo') ? '⚙️' : '🔨'}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:text,fontSize:14}}>{s.type}</div>
              <div style={{color:'var(--muted)',fontSize:12,marginTop:2}}>Zona {s.zone} · {s.operator}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:600,color:text,fontSize:13}}>{s.date}</div>
              <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background:'#dcfce7',color:'#166534',fontWeight:600}}>{s.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Fault Report Modal ───────────────────────────────────────────────────────

function FaultReportModal({ spot, onClose, onSubmit }) {
  const [report, setReport] = useState('')
  const types = ['Sporco/Rifiuti', 'Segnaletica danneggiata', 'Illuminazione guasta', 'Pavimentazione danneggiata', 'Altro']
  const [selected, setSelected] = useState('')

  function handleSubmit() {
    const msg = selected ? `${selected}: ${report}` : report
    if (!msg.trim()) return
    onSubmit(spot.id, msg)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:460}}>
        <div className="modal-header">
          <div>
            <h2 className="section-title">⚠️ Segnala guasto — {spot.id}</h2>
            <p className="muted-text">Zona {spot.zone} · Aiutaci a migliorare il parcheggio</p>
          </div>
          <button className="btn-secondary" onClick={onClose}>✕</button>
        </div>
        <div style={{marginBottom:16}}>
          <span className="modal-label">Tipo problema</span>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
            {types.map(t => (
              <button key={t} onClick={() => setSelected(t)}
                style={{padding:'6px 12px',borderRadius:20,border:'1px solid',cursor:'pointer',fontSize:13,fontWeight:600,
                  borderColor:selected===t?'#ef4444':'var(--border-color)',
                  background:selected===t?'#fef2f2':'transparent',
                  color:selected===t?'#ef4444':'var(--muted)'}}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="modal-label">Descrizione (opzionale)</span>
          <textarea value={report} onChange={e => setReport(e.target.value)}
            placeholder="Descrivi il problema in dettaglio..."
            rows={3}
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid var(--border-color)',fontSize:14,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',marginTop:6}} />
        </label>
        <div className="modal-actions" style={{marginTop:20}}>
          <button className="btn-secondary" onClick={onClose}>Annulla</button>
          <button onClick={handleSubmit} disabled={!selected && !report.trim()}
            style={{padding:'10px 20px',borderRadius:10,border:'none',background:'#ef4444',color:'white',fontWeight:700,cursor:'pointer',fontSize:14,opacity:(!selected&&!report.trim())?0.5:1}}>
            🚨 Invia segnalazione
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Loyalty Widget ───────────────────────────────────────────────────────────

function LoyaltyWidget({ points, darkMode }) {
  const nextReward = Math.ceil(points / 10000) * 10000
  const pct = Math.min(100, (points % 10000) / 100)

  return (
    <div style={{
      background: darkMode ? 'linear-gradient(135deg,#1e3a8a,#1e293b)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)',
      borderRadius: 16, padding: 20, border: '1px solid #bfdbfe'
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div>
          <div style={{fontWeight:800,fontSize:16,color:darkMode?'#f1f5f9':'#1e3a8a'}}>⭐ Programma Fedeltà</div>
          <div style={{color:darkMode?'#94a3b8':'#3b82f6',fontSize:13,marginTop:2}}>100 punti per ogni ora di sosta</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:900,fontSize:28,color:'#2563eb'}}>{points.toLocaleString()}</div>
          <div style={{color:'var(--muted)',fontSize:12}}>punti accumulati</div>
        </div>
      </div>
      <div style={{background:darkMode?'#0f172a':'white',borderRadius:8,height:10,overflow:'hidden',marginBottom:8}}>
        <div style={{height:'100%',background:'linear-gradient(90deg,#2563eb,#60a5fa)',width:`${pct}%`,transition:'width 1s ease',borderRadius:8}} />
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)'}}>
        <span>{(points % 10000).toLocaleString()} / 10.000 punti</span>
        <span>🎁 Prossimo premio: 1 ora gratis a {Math.floor(nextReward/100)} ore</span>
      </div>
      {points >= 10000 && (
        <div style={{marginTop:12,padding:'10px 14px',background:'#dcfce7',borderRadius:10,color:'#166534',fontWeight:700,fontSize:14,textAlign:'center'}}>
          🎉 Hai abbastanza punti per un'ora gratis!
        </div>
      )}
    </div>
  )
}

// ─── Booking Modal (con coupon e fix orario) ───────────────────────────────────

function BookingModal({ spot, user, onClose, onConfirm, darkMode }) {
  // FIX: il tempo di partenza parte dall'ora corrente ma può essere nel futuro
  const now = new Date()
  const defaultStart = new Date(now)
  const defaultEnd = new Date(now.getTime() + 2 * 3600000)
  const fmt = d => d.toISOString().slice(0, 16)
  const fmtMin = d => d.toISOString().slice(0, 16)

  const [startTime, setStartTime] = useState(fmt(defaultStart))
  const [endTime, setEndTime] = useState(fmt(defaultEnd))
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)

  // Aggiorna fine automaticamente se inizio cambia e fine precede inizio
  function handleStartChange(val) {
    setStartTime(val)
    if (new Date(val) >= new Date(endTime)) {
      const newEnd = new Date(new Date(val).getTime() + 2 * 3600000)
      setEndTime(fmt(newEnd))
    }
  }

  const rawDuration = Math.max(0, (new Date(endTime) - new Date(startTime)) / 3600000)
  const duration = rawDuration.toFixed(1)
  const baseTotal = rawDuration * spot.cost
  const discount = couponResult?.valid ? baseTotal * (couponResult.discount_pct / 100) : 0
  const total = Math.max(0, baseTotal - discount).toFixed(2)

  async function validateCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const res = await fetch(`${API}/coupons/validate`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ code: couponCode })
      })
      const data = await res.json()
      setCouponResult(data)
    } catch {
      setCouponResult({ valid: false, error: 'Errore di connessione' })
    }
    setCouponLoading(false)
  }

  function handleConfirm() {
    const booking = {
      spotId: spot.id,
      zone: spot.zone,
      type: spot.parking_type,
      cost: spot.cost,
      startTimeRaw: startTime,
      endTimeRaw: endTime,
      duration: parseFloat(duration),
      coupon: couponResult?.valid ? couponCode : null,
      discountedTotal: parseFloat(total)
    }
    onConfirm(booking)
    onClose()
  }

  // CO2 risparmio in base al piano (simula floor_level come zona)
  const zoneToFloor = { A: 1, B: 2, C: 3, D: 4 }
  const floor = zoneToFloor[spot.zone] || 1
  const co2 = co2Saved(floor)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="section-title">Prenota posto {spot.id}</h2>
            <p className="muted-text">Zona {spot.zone} · {formatType(spot.parking_type)} · €{spot.cost}/ora</p>
          </div>
          <button className="btn-secondary" onClick={onClose}>Chiudi</button>
        </div>

        {/* CO2 badge */}
        {floor === 1 && (
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'#f0fdf4',borderRadius:12,marginBottom:16,border:'1px solid #bbf7d0'}}>
            <span style={{fontSize:22}}>🌿</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:13,color:'#166534'}}>Scelta eco-sostenibile!</div>
              <div style={{color:'#15803d',fontSize:12}}>
                Parcheggiando in Zona A (livello più vicino all'uscita), hai risparmiato <strong>15g di CO₂</strong> rispetto alla Zona D
              </div>
            </div>
          </div>
        )}
        {floor > 1 && (
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',background:'#fffbeb',borderRadius:12,marginBottom:16,border:'1px solid #fde68a'}}>
            <span style={{fontSize:22}}>🍃</span>
            <div style={{fontSize:12,color:'#92400e'}}>
              Considera la <strong>Zona A</strong> — risparmieresti <strong>{co2}g di CO₂</strong> camminando meno verso l'uscita!
            </div>
          </div>
        )}

        {/* Spot preview */}
        <div className="booking-spot-preview">
          <span style={{ fontSize: 32 }}>{getVehicleIcon(spot.parking_type)}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{spot.id}</div>
            <div className="muted-text">Zona {spot.zone} · {formatType(spot.parking_type)}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--primary)' }}>€{spot.cost}</div>
            <div className="muted-text" style={{ fontSize: 12 }}>al ora</div>
          </div>
        </div>

        <div className="modal-grid">
          <label>
            <span className="modal-label">Inizio prenotazione</span>
            <input type="datetime-local" value={startTime}
              onChange={e => handleStartChange(e.target.value)}
              min={fmtMin(now)} />
          </label>
          <label>
            <span className="modal-label">Fine prenotazione</span>
            <input type="datetime-local" value={endTime}
              onChange={e => setEndTime(e.target.value)}
              min={startTime} />
          </label>
          <label>
            <span className="modal-label">Intestatario</span>
            <input type="text" value={user.name} readOnly />
          </label>
          <label>
            <span className="modal-label">Targa</span>
            <input type="text" value={user.plate || ''} readOnly />
          </label>
        </div>

        {/* Coupon */}
        <div style={{marginTop:16}}>
          <span className="modal-label">Codice promozionale</span>
          <div style={{display:'flex',gap:10,marginTop:6}}>
            <input
              type="text"
              placeholder="Es. PARK10"
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null) }}
              style={{flex:1,padding:'10px 14px',borderRadius:10,border:`1px solid ${couponResult?.valid?'#22c55e':couponResult?.valid===false?'#ef4444':'var(--border-color)'}`,fontSize:14}}
            />
            <button onClick={validateCoupon} disabled={couponLoading || !couponCode.trim()}
              style={{padding:'10px 18px',borderRadius:10,border:'none',background:'#2563eb',color:'white',fontWeight:700,cursor:'pointer',fontSize:14,opacity:!couponCode.trim()?0.5:1}}>
              {couponLoading ? '…' : 'Applica'}
            </button>
          </div>
          {couponResult?.valid && (
            <div style={{marginTop:8,padding:'8px 14px',background:'#f0fdf4',borderRadius:8,color:'#166534',fontSize:13,fontWeight:600}}>
              ✅ {couponResult.description} — Sconto {couponResult.discount_pct}% applicato!
            </div>
          )}
          {couponResult?.valid === false && (
            <div style={{marginTop:8,padding:'8px 14px',background:'#fef2f2',borderRadius:8,color:'#dc2626',fontSize:13}}>
              ❌ {couponResult.error}
            </div>
          )}
        </div>

        {/* Riepilogo costo */}
        <div className="booking-cost-summary">
          <div className="booking-cost-row"><span>Durata</span><strong>{duration} ore</strong></div>
          <div className="booking-cost-row"><span>Tariffa oraria</span><strong>€{spot.cost}/ora</strong></div>
          {discount > 0 && (
            <div className="booking-cost-row" style={{color:'#22c55e'}}>
              <span>Sconto coupon ({couponResult.discount_pct}%)</span>
              <strong>-€{discount.toFixed(2)}</strong>
            </div>
          )}
          <div className="booking-cost-row booking-cost-total">
            <span>Totale stimato</span>
            <strong>€{total}</strong>
          </div>
          <div style={{fontSize:12,color:'#2563eb',marginTop:4}}>⭐ +{Math.floor(rawDuration * 100)} punti fedeltà</div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Annulla</button>
          <button className="btn-primary" onClick={handleConfirm} disabled={rawDuration <= 0}>
            ✅ Conferma prenotazione
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Profile Modal ─────────────────────────────────────────────────────────────

function ProfileModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ ...user })
  function handleChange(e) { setForm(prev => ({ ...prev, [e.target.name]: e.target.value })) }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="section-title">Il tuo profilo</h2>
            <p className="muted-text">Modifica i tuoi dati personali</p>
          </div>
          <button className="btn-secondary" onClick={onClose}>Chiudi</button>
        </div>
        <div className="modal-grid">
          {[
            { label: 'Nome completo', name: 'name', type: 'text' },
            { label: 'Email', name: 'email', type: 'email' },
            { label: 'Telefono', name: 'phone', type: 'tel' },
            { label: 'Targa veicolo', name: 'plate', type: 'text' },
          ].map(f => (
            <label key={f.name}>
              <span className="modal-label">{f.label}</span>
              <input type={f.type} name={f.name} value={form[f.name] || ''} onChange={handleChange} />
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Annulla</button>
          <button className="btn-primary" onClick={() => { onSave(form); onClose() }}>Salva profilo</button>
        </div>
      </div>
    </div>
  )
}

// ─── Countdown Badge ──────────────────────────────────────────────────────────

function CountdownBadge({ endTime, onExtend }) {
  const remaining = useCountdown(endTime)
  const mins = Math.floor(remaining / 60000)
  const urgent = mins <= 30 && remaining > 0
  const expired = remaining === 0

  return (
    <div className={`countdown-badge ${urgent ? 'countdown-urgent' : ''} ${expired ? 'countdown-expired' : ''}`}>
      <span className="countdown-icon">{expired ? '⛔' : urgent ? '⚠️' : '⏱'}</span>
      <div>
        <div className="countdown-label">{expired ? 'Prenotazione scaduta' : urgent ? 'In scadenza!' : 'Tempo rimanente'}</div>
        <div className="countdown-time">{formatDuration(remaining)}</div>
      </div>
      {urgent && !expired && (
        <button className="btn-primary" style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: 13 }} onClick={onExtend}>
          +1 ora
        </button>
      )}
    </div>
  )
}

// ─── Booking Card ──────────────────────────────────────────────────────────────

function BookingCard({ booking, onCancel, onExtend, onDownloadPDF, onFaultReport, user }) {
  const isActive = booking.status === 'active'

  return (
    <div className={`booking-card ${isActive ? 'booking-card-active' : 'booking-card-past'}`}>
      <div className="booking-card-header">
        <div>
          <div className="booking-code">{booking.booking_code}</div>
          <div className="muted-text" style={{ fontSize: 13, marginTop: 4 }}>
            {booking.spot_id} · Zona {booking.zone} · {formatType(booking.parking_type)}
          </div>
        </div>
        <span className={`spot-status-badge ${isActive ? 'status-success' : 'status-neutral'}`}>
          {isActive ? '🟢 Attiva' : '⚫ Conclusa'}
        </span>
      </div>

      {isActive && (
        <CountdownBadge endTime={booking.end_time_raw} onExtend={() => onExtend(booking.id, booking)} />
      )}

      <div className="booking-info-grid">
        <div><span className="modal-label">Inizio</span><p className="muted-text">{booking.start_time}</p></div>
        <div><span className="modal-label">Fine</span><p className="muted-text">{booking.end_time}</p></div>
        <div><span className="modal-label">Durata</span><p className="muted-text">{booking.duration_hours} ore</p></div>
        <div><span className="modal-label">Totale</span><p className="muted-text">€{Number(booking.total_cost).toFixed(2)}</p></div>
      </div>

      <div className="booking-card-actions">
        <button className="btn-secondary" onClick={() => onDownloadPDF(booking)}>📄 PDF</button>
        {isActive && (
          <>
            <button onClick={() => onFaultReport({ id: booking.spot_id, zone: booking.zone })}
              style={{padding:'8px 14px',borderRadius:10,border:'1px solid #f87171',background:'transparent',color:'#ef4444',fontWeight:600,cursor:'pointer',fontSize:13}}>
              ⚠️ Segnala guasto
            </button>
            <button className="btn-danger" onClick={() => onCancel(booking.id)}>🗑 Cancella</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main UserPage ─────────────────────────────────────────────────────────────

export default function UserPage({ initialUser, onLogout }) {
  const [spots, setSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [user, setUser] = useState(initialUser || { id: null, name: '', email: '', phone: '', plate: '' })
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [activeView, setActiveView] = useState('spots')
  const [mapSelectedSpot, setMapSelectedSpot] = useState(null)
  const [focusedZone, setFocusedZone] = useState('A')
  const [mapViewMode, setMapViewMode] = useState('overview')
  const [bookingSpot, setBookingSpot] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [faultSpot, setFaultSpot] = useState(null)
  const [notification, setNotification] = useState(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('parkuda_dark') === '1')

  useEffect(() => {
    document.body.style.background = darkMode ? '#0f172a' : ''
    document.body.style.color = darkMode ? '#f1f5f9' : ''
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('parkuda_dark', darkMode ? '1' : '0')
  }, [darkMode])

  useEffect(() => {
    fetch(`${API}/spots`).then(r => r.json()).then(data => { setSpots(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetch(`${API}/bookings?user_id=${user.id}`).then(r => r.json()).then(data => setBookings(Array.isArray(data) ? data : [])).catch(() => {})
    fetch(`${API}/users/${user.id}/loyalty`).then(r => r.json()).then(d => setLoyaltyPoints(d.loyalty_points || 0)).catch(() => {})
  }, [user?.id])

  function showNotif(msg, type = 'success') {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4500)
  }

  const availableSpots = useMemo(() => {
    return spots.filter(spot => {
      if (spot.status !== 'free' || spot.maintenance) return false
      if (typeFilter !== 'all' && spot.parking_type !== typeFilter) return false
      if (zoneFilter !== 'all' && spot.zone !== zoneFilter) return false
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        return spot.id.toLowerCase().includes(s) || spot.parking_type.toLowerCase().includes(s)
      }
      return true
    })
  }, [spots, typeFilter, zoneFilter, searchTerm])

  const zoneSummary = useMemo(() => {
    return ['A','B','C','D'].map(zone => {
      const zs = spots.filter(s => s.zone === zone)
      return { zone, total: zs.length, free: zs.filter(s => s.status==='free'&&!s.maintenance).length, occupied: zs.filter(s => s.status==='occupied'&&!s.maintenance).length, maintenance: zs.filter(s => s.maintenance).length }
    })
  }, [spots])

  function handleMapSpotClick(spot) {
    setMapSelectedSpot(spot)
    if (spot.status === 'free' && !spot.maintenance) setBookingSpot(spot)
  }

  const activeBookings = bookings.filter(b => b.status === 'active')
  const pastBookings = bookings.filter(b => b.status !== 'active')

  async function handleConfirmBooking(booking) {
    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          user_id: user.id, spot_id: booking.spotId,
          start_time: booking.startTimeRaw, end_time: booking.endTimeRaw,
          duration_hours: booking.duration, total_cost: booking.discountedTotal ?? (booking.cost * booking.duration),
        })
      })
      const data = await res.json()
      if (!res.ok) { showNotif('❌ ' + (data.error || 'Errore prenotazione'), 'error'); return }
      if (data.loyalty_points_earned) setLoyaltyPoints(p => p + data.loyalty_points_earned)
      const [bookingsRes, spotsRes] = await Promise.all([
        fetch(`${API}/bookings?user_id=${user.id}`).then(r => r.json()),
        fetch(`${API}/spots`).then(r => r.json()),
      ])
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : [])
      setSpots(Array.isArray(spotsRes) ? spotsRes : [])
      showNotif(`✅ Prenotazione confermata! Codice: ${data.booking_code} · +${data.loyalty_points_earned} punti fedeltà`)
    } catch { showNotif('❌ Errore di rete', 'error') }
  }

  async function handleCancelBooking(bookingId) {
    if (!confirm('Sei sicuro di voler cancellare questa prenotazione?')) return
    try {
      const res = await fetch(`${API}/bookings/${bookingId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { showNotif('❌ ' + (data.error || 'Errore'), 'error'); return }
      const [bookingsRes, spotsRes] = await Promise.all([
        fetch(`${API}/bookings?user_id=${user.id}`).then(r => r.json()),
        fetch(`${API}/spots`).then(r => r.json()),
      ])
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : [])
      setSpots(Array.isArray(spotsRes) ? spotsRes : [])
      showNotif('🗑 Prenotazione cancellata')
    } catch { showNotif('❌ Errore di rete', 'error') }
  }

  async function handleExtendBooking(bookingId, current) {
    try {
      const newEnd = new Date(new Date(current.end_time_raw).getTime() + 3600000)
      const newDuration = Number(current.duration_hours) + 1
      const newCost = (newDuration * Number(current.hourly_cost)).toFixed(2)
      const res = await fetch(`${API}/bookings/${bookingId}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ end_time: newEnd.toISOString(), duration_hours: newDuration, total_cost: newCost })
      })
      if (!res.ok) { showNotif('❌ Errore estensione', 'error'); return }
      const bookingsRes = await fetch(`${API}/bookings?user_id=${user.id}`).then(r => r.json())
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : [])
      setLoyaltyPoints(p => p + 100)
      showNotif('⏱ Prenotazione estesa di 1 ora · +100 punti')
    } catch { showNotif('❌ Errore di rete', 'error') }
  }

  async function handleFaultReport(spot, report) {
    try {
      const res = await fetch(`${API}/spots/${spot.id}/fault`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ report })
      })
      const data = await res.json()
      if (!res.ok) { showNotif('❌ ' + (data.error || 'Errore'), 'error'); return }
      showNotif('✅ Segnalazione inviata. Grazie!')
      const spotsRes = await fetch(`${API}/spots`).then(r => r.json())
      setSpots(Array.isArray(spotsRes) ? spotsRes : [])
    } catch { showNotif('❌ Errore di rete', 'error') }
  }

  function handleDownloadPDF(booking) {
    generateBookingPDF(booking, user).catch(() => showNotif('Errore nel PDF', 'error'))
  }

  const dm = darkMode
  const sidebarBg = dm ? '#0f172a' : '#1e3a8a'
  const mainBg = dm ? '#0f172a' : '#f1f5f9'

  return (
    <div className="app-shell" style={{background: mainBg}}>
      {/* Dark mode CSS override */}
      {dm && (
        <style>{`
          .panel { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
          .modal-content { background: #1e293b !important; color: #f1f5f9 !important; border-color: #334155 !important; }
          .modal-overlay { background: rgba(0,0,0,0.7) !important; }
          input, select, textarea { background: #0f172a !important; color: #f1f5f9 !important; border-color: #334155 !important; }
          .spot-user-card { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
          .booking-card { background: #1e293b !important; border-color: #334155 !important; }
          .booking-cost-summary { background: #0f172a !important; border-color: #334155 !important; }
        `}</style>
      )}

      {/* Sidebar */}
      <aside className="sidebar" style={{background: sidebarBg}}>
        <div style={{ marginBottom: 20 }}>
          <div className="sidebar-title">🅿 ParkUser</div>
          <p className="sidebar-subtitle">Prenota il tuo parcheggio</p>
        </div>

        {/* Dark mode toggle */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,0.08)',marginBottom:16,cursor:'pointer'}}
          onClick={() => setDarkMode(d => !d)}>
          <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.8)'}}>{dm ? '🌙 Modalità scura' : '☀️ Modalità chiara'}</span>
          <div style={{width:42,height:24,borderRadius:12,background:dm?'#2563eb':'rgba(255,255,255,0.3)',position:'relative',transition:'background 0.3s'}}>
            <div style={{position:'absolute',top:2,left:dm?18:2,width:20,height:20,borderRadius:'50%',background:'white',transition:'left 0.3s'}} />
          </div>
        </div>

        {/* Profilo */}
        <div className="user-profile-box" onClick={() => setShowProfile(true)}>
          <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{user.email}</div>
            {user.plate && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>🚗 {user.plate}</div>}
          </div>
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>✏️</span>
        </div>

        {/* Nav */}
        <div className="sidebar-section">
          <span className="sidebar-label">Navigazione</span>
          {[
            { id: 'spots', icon: '🅿', label: 'Posti disponibili', count: availableSpots.length },
            { id: 'map', icon: '🗺', label: 'Mappa parcheggio', count: null },
            { id: 'location', icon: '📍', label: 'Dove siamo', count: null },
            { id: 'bookings', icon: '📋', label: 'Le mie prenotazioni', count: activeBookings.length },
            { id: 'stats', icon: '📊', label: 'Statistiche visite', count: null },
            { id: 'maintenance', icon: '🔧', label: 'Manutenzione', count: null },
          ].map(tab => (
            <button key={tab.id} type="button"
              className={`user-nav-btn ${activeView === tab.id ? 'active' : ''}`}
              onClick={() => setActiveView(tab.id)}>
              <span>{tab.icon} {tab.label}</span>
              {tab.count !== null && <span className="user-nav-badge">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* Filtri posti */}
        {activeView === 'spots' && (
          <>
            <div className="sidebar-section">
              <span className="sidebar-label">Tipo parcheggio</span>
              <select className="filter-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">Tutti i tipi</option>
                <option value="normal">Normale</option>
                <option value="disabled">Disabili ♿</option>
                <option value="electric">Elettrico ⚡</option>
                <option value="motorcycle">Moto 🏍️</option>
                <option value="van">Van 🚐</option>
              </select>
            </div>
            <div className="sidebar-section">
              <span className="sidebar-label">Zona</span>
              <select className="filter-control" value={zoneFilter} onChange={e => setZoneFilter(e.target.value)}>
                <option value="all">Tutte le zone</option>
                {['A','B','C','D'].map(z => <option key={z} value={z}>Zona {z}</option>)}
              </select>
            </div>
            <div className="sidebar-section">
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => { setTypeFilter('all'); setZoneFilter('all'); setSearchTerm('') }}>
                Reimposta filtri
              </button>
            </div>
          </>
        )}

        {onLogout && (
          <div className="sidebar-section">
            <button className="btn-danger" style={{ width: '100%' }} onClick={onLogout}>🚪 Esci</button>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>STATISTICHE</div>
          {[
            { label: 'Posti liberi', value: spots.filter(s => s.status==='free'&&!s.maintenance).length, color: '#b9fbc0' },
            { label: 'Prenotazioni attive', value: activeBookings.length, color: '#93c5fd' },
            { label: 'Punti fedeltà', value: loyaltyPoints.toLocaleString(), color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.color, fontSize: 13 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" style={{background: mainBg}}>
        <div className="dashboard-stack">

          {/* Header */}
          <section className="panel header-panel" style={{background: dm?'#1e293b':'white'}}>
            <div>
              <h2 className="page-title" style={{color: dm?'#f1f5f9':'#0f172a'}}>
                {activeView === 'spots' ? 'Posti disponibili'
                  : activeView === 'map' ? 'Mappa parcheggio'
                  : activeView === 'location' ? 'Dove siamo'
                  : activeView === 'bookings' ? 'Le mie prenotazioni'
                  : activeView === 'stats' ? 'Statistiche visite'
                  : 'Turni Manutenzione'}
              </h2>
              <p className="muted-text">
                {activeView === 'spots' ? `${availableSpots.length} posti liberi · Clicca per prenotare`
                  : activeView === 'map' ? 'Clicca un posto libero per prenotarlo'
                  : activeView === 'location' ? 'Parcheggio Piazza Vittoria'
                  : activeView === 'bookings' ? `${activeBookings.length} attive · ${pastBookings.length} concluse`
                  : activeView === 'stats' ? 'Analisi frequenza prenotazioni'
                  : 'Calendario interventi programmati'}
              </p>
            </div>
            {activeView === 'spots' && (
              <input placeholder="Cerca per ID o tipo…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{borderRadius:12,border:'1px solid var(--border-color)',padding:'10px 14px',minWidth:260,background:dm?'#0f172a':'white',color:dm?'#f1f5f9':'#0f172a'}} />
            )}
            {activeView === 'map' && (
              <div className="zone-tabs">
                <button type="button" className={`zone-tab ${mapViewMode==='overview'?'active':''}`} onClick={() => setMapViewMode('overview')}>Panoramica</button>
                {['A','B','C','D'].map(z => (
                  <button key={z} type="button" className={`zone-tab ${mapViewMode==='focus'&&focusedZone===z?'active':''}`}
                    onClick={() => { setFocusedZone(z); setMapViewMode('focus') }}>
                    Zona {z}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Vista posti */}
          {activeView === 'spots' && (
            <section className="panel" style={{background: dm?'#1e293b':'white'}}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}><div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>Caricamento…</div>
              ) : availableSpots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🅿</div>Nessun posto disponibile</div>
              ) : (
                <div className="spots-user-grid">
                  {availableSpots.map(spot => (
                    <div key={spot.id} className="spot-user-card" onClick={() => setBookingSpot(spot)}>
                      <div className="spot-user-top">
                        <span style={{ fontSize: 28 }}>{getVehicleIcon(spot.parking_type)}</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 16 }}>{spot.id}</div>
                          <div className="muted-text" style={{ fontSize: 13 }}>Zona {spot.zone}</div>
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>€{spot.cost}</div>
                          <div className="muted-text" style={{ fontSize: 11 }}>/ora</div>
                        </div>
                      </div>
                      {spot.zone === 'A' && (
                        <div style={{fontSize:11,color:'#166534',background:'#f0fdf4',padding:'3px 8px',borderRadius:20,marginTop:6,fontWeight:600,display:'inline-block'}}>
                          🌿 -15g CO₂
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        <span className={`spot-status-badge ${getBadgeClass(spot)}`}>{formatType(spot.parking_type)}</span>
                        <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 13 }}
                          onClick={e => { e.stopPropagation(); setBookingSpot(spot) }}>
                          Prenota
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Vista mappa */}
          {activeView === 'map' && (
            <>
              <div className="user-map-legend panel" style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center',padding:'14px 20px',background:dm?'#1e293b':'white'}}>
                <span style={{fontWeight:700,fontSize:13,color:'var(--muted)'}}>LEGENDA:</span>
                {[
                  {color:'var(--success)',label:'Libero'},
                  {color:'var(--danger)',label:'Occupato'},
                  {color:'var(--warning)',label:'Manutenzione'},
                  {color:'var(--info)',label:'Disabili'},
                ].map(item => (
                  <div key={item.label} style={{display:'flex',alignItems:'center',gap:7}}>
                    <div style={{width:14,height:14,borderRadius:4,background:item.color,flexShrink:0}} />
                    <span style={{fontSize:13,color:'var(--muted)'}}>{item.label}</span>
                  </div>
                ))}
              </div>
              <ParkingMapView spots={spots} zoneSummary={zoneSummary} selectedZone={focusedZone}
                selectedSpot={mapSelectedSpot} onSpotClick={handleMapSpotClick}
                viewMode={mapViewMode} matchesFilters={s => s.status==='free'&&!s.maintenance} />
            </>
          )}

          {/* Vista posizione Leaflet */}
          {activeView === 'location' && (
            <section className="panel" style={{background:dm?'#1e293b':'white'}}>
              <ParkingLocationMap darkMode={dm} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginTop:20}}>
                {[
                  {icon:'⏰',label:'Orario',value:'24h / 7 giorni'},
                  {icon:'📞',label:'Telefono',value:'+39 080 583 5200'},
                  {icon:'🚌',label:'Navetta',value:'Ogni 15 minuti'},
                ].map(i => (
                  <div key={i.label} style={{textAlign:'center',padding:20,background:dm?'#0f172a':'#f8fafc',borderRadius:14,border:`1px solid ${dm?'#334155':'#e2e8f0'}`}}>
                    <div style={{fontSize:32,marginBottom:8}}>{i.icon}</div>
                    <div style={{fontWeight:700,color:dm?'#f1f5f9':'#0f172a'}}>{i.value}</div>
                    <div style={{color:'var(--muted)',fontSize:12,marginTop:4}}>{i.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Vista prenotazioni */}
          {activeView === 'bookings' && (
            <>
              <LoyaltyWidget points={loyaltyPoints} darkMode={dm} />

              {activeBookings.length > 0 && (
                <section className="panel" style={{background:dm?'#1e293b':'white'}}>
                  <h3 className="section-title" style={{marginBottom:16,color:dm?'#f1f5f9':'#0f172a'}}>🟢 Prenotazioni attive</h3>
                  <div style={{display:'grid',gap:16}}>
                    {activeBookings.map(b => (
                      <BookingCard key={b.id} booking={b} user={user}
                        onCancel={handleCancelBooking} onExtend={handleExtendBooking}
                        onDownloadPDF={handleDownloadPDF}
                        onFaultReport={spot => setFaultSpot(spot)} />
                    ))}
                  </div>
                </section>
              )}

              {pastBookings.length > 0 && (
                <section className="panel" style={{background:dm?'#1e293b':'white'}}>
                  <h3 className="section-title" style={{marginBottom:16,color:dm?'#f1f5f9':'#0f172a'}}>⚫ Storico prenotazioni</h3>
                  <div style={{display:'grid',gap:16}}>
                    {pastBookings.map(b => (
                      <BookingCard key={b.id} booking={b} user={user}
                        onCancel={handleCancelBooking} onExtend={handleExtendBooking}
                        onDownloadPDF={handleDownloadPDF}
                        onFaultReport={spot => setFaultSpot(spot)} />
                    ))}
                  </div>
                </section>
              )}

              {bookings.length === 0 && (
                <section className="panel" style={{textAlign:'center',padding:60,color:'var(--muted)',background:dm?'#1e293b':'white'}}>
                  <div style={{fontSize:40,marginBottom:12}}>📋</div>
                  <p>Nessuna prenotazione.<br />Vai su <strong>Posti disponibili</strong> per prenotare!</p>
                  <button className="btn-primary" style={{marginTop:16}} onClick={() => setActiveView('spots')}>Vai ai posti</button>
                </section>
              )}
            </>
          )}

          {/* Statistiche visite */}
          {activeView === 'stats' && (
            <section className="panel" style={{background:dm?'#1e293b':'white'}}>
              <VisitChart darkMode={dm} />
            </section>
          )}

          {/* Manutenzione */}
          {activeView === 'maintenance' && (
            <section className="panel" style={{background:dm?'#1e293b':'white'}}>
              <MaintenanceSchedule darkMode={dm} />
            </section>
          )}
        </div>
      </main>

      {/* Modals */}
      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} onSave={async (updated) => {
          try {
            const res = await fetch(`${API}/users/${user.id}`, {
              method: 'PUT', headers: {'Content-Type':'application/json'},
              body: JSON.stringify(updated)
            })
            const data = await res.json()
            if (!res.ok) { showNotif('❌ ' + (data.error||'Errore'), 'error'); return }
            setUser({...data, loyalty_points: loyaltyPoints})
            showNotif('✅ Profilo aggiornato')
          } catch { showNotif('❌ Errore di rete', 'error') }
        }} />
      )}

      {bookingSpot && (
        <BookingModal spot={bookingSpot} user={user} darkMode={dm}
          onClose={() => setBookingSpot(null)} onConfirm={handleConfirmBooking} />
      )}

      {faultSpot && (
        <FaultReportModal spot={faultSpot} onClose={() => setFaultSpot(null)}
          onSubmit={(spotId, report) => handleFaultReport({ id: spotId }, report)} />
      )}

      {/* Toast */}
      {notification && (
        <div className={`toast-notif ${notification.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {notification.msg}
        </div>
      )}
    </div>
  )
}
