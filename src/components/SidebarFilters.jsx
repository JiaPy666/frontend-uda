import { useState } from 'react'

function NavButton({ icon, label, active, badge, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      width:'100%', padding:'11px 14px', borderRadius:12,
      background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
      border: active ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
      color: active ? 'white' : 'rgba(255,255,255,0.65)',
      fontWeight: active ? 700 : 500, fontSize:14, textAlign:'left',
      cursor:'pointer', marginBottom:4, transition:'all 0.15s'
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:16}}>{icon}</span>
        {label}
      </span>
      {badge !== undefined && badge !== null && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
          color: 'white', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700
        }}>{badge}</span>
      )}
    </button>
  )
}

function SidebarFilters({ filters, onFilterChange, onResetFilters, activeAdminView, onAdminViewChange, spotStats }) {
  const [filtersOpen, setFiltersOpen] = useState(true)

  function handleChange(event) {
    const { name, value } = event.target
    onFilterChange(name, value)
  }

  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', badge: null },
    { id: 'map', icon: '🗺', label: 'Mappa parcheggio', badge: null },
    { id: 'maintenance', icon: '🔧', label: 'Manutenzione', badge: spotStats?.maintenance || null },
  ]

  return (
    <section style={{
      background: 'linear-gradient(180deg,#0f172a 0%,#1e3a8a 100%)',
      height: '100%', minHeight: '100vh', padding: '24px 16px',
      display: 'flex', flexDirection: 'column', gap: 0,
      color: 'white', overflowY: 'auto'
    }}>
      {/* Logo */}
      <div style={{marginBottom:28,paddingBottom:20,borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
          <div style={{width:36,height:36,borderRadius:10,background:'#2563eb',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>
            🅿
          </div>
          <div>
            <div style={{fontWeight:900,fontSize:16,color:'white'}}>ParkAdmin</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>Pannello di controllo</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',marginBottom:8,paddingLeft:4}}>
          NAVIGAZIONE
        </div>
        {navItems.map(item => (
          <NavButton key={item.id}
            icon={item.icon} label={item.label}
            active={activeAdminView === item.id}
            badge={item.badge}
            onClick={() => onAdminViewChange?.(item.id)}
          />
        ))}
      </div>

      {/* Stats cards */}
      {spotStats && (
        <div style={{marginBottom:24,padding:'16px',background:'rgba(255,255,255,0.06)',borderRadius:14,border:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',marginBottom:12}}>
            STATO PARCHEGGIO
          </div>
          {[
            {label:'Posti liberi', value: spotStats.free, color:'#4ade80'},
            {label:'Occupati', value: spotStats.occupied, color:'#f87171'},
            {label:'Manutenzione', value: spotStats.maintenance, color:'#fbbf24'},
            {label:'Totale posti', value: spotStats.total, color:'#93c5fd'},
          ].map(s => (
            <div key={s.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>{s.label}</span>
              <span style={{fontWeight:800,fontSize:14,color:s.color}}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtri (solo in dashboard/map) */}
      {(activeAdminView === 'dashboard' || activeAdminView === 'map' || !activeAdminView) && (
        <div>
          <button onClick={() => setFiltersOpen(o => !o)} style={{
            display:'flex',alignItems:'center',justifyContent:'space-between',
            width:'100%',background:'transparent',border:'none',cursor:'pointer',
            padding:'0 4px',marginBottom:10
          }}>
            <div style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em'}}>
              FILTRI POSTI
            </div>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:12,transition:'transform 0.2s',transform:filtersOpen?'rotate(90deg)':'rotate(0)'}}>▶</span>
          </button>

          {filtersOpen && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                { name:'zone', label:'Zona', options:[{v:'',l:'Tutte'},{v:'A',l:'Zona A'},{v:'B',l:'Zona B'},{v:'C',l:'Zona C'},{v:'D',l:'Zona D'}] },
                { name:'status', label:'Stato', options:[{v:'',l:'Tutti'},{v:'free',l:'🟢 Libero'},{v:'occupied',l:'🔴 Occupato'}] },
                { name:'parkingType', label:'Tipo parcheggio', options:[{v:'',l:'Tutti'},{v:'normal',l:'Normale'},{v:'disabled',l:'♿ Disabili'},{v:'electric',l:'⚡ Elettrico'},{v:'motorcycle',l:'🏍 Moto'},{v:'van',l:'🚐 Van'}] },
                { name:'vehicleType', label:'Tipo veicolo', options:[{v:'',l:'Tutti'},{v:'car',l:'🚗 Auto'},{v:'motorcycle',l:'🏍 Moto'},{v:'van',l:'🚐 Van'}] },
                { name:'maintenance', label:'Manutenzione', options:[{v:'',l:'Tutti'},{v:'true',l:'Solo manutenzione'},{v:'false',l:'Escludi manutenzione'}] },
              ].map(f => (
                <label key={f.name} style={{display:'flex',flexDirection:'column',gap:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)',letterSpacing:'0.04em'}}>{f.label.toUpperCase()}</span>
                  <select name={f.name} value={filters[f.name]} onChange={handleChange} style={{
                    padding:'8px 12px',borderRadius:10,
                    border:'1px solid rgba(255,255,255,0.15)',
                    background:'rgba(255,255,255,0.08)',
                    color:'white',fontSize:13,fontFamily:'inherit',cursor:'pointer'
                  }}>
                    {f.options.map(o => <option key={o.v} value={o.v} style={{background:'#1e293b',color:'white'}}>{o.l}</option>)}
                  </select>
                </label>
              ))}

              <button type="button" onClick={onResetFilters} style={{
                padding:'9px 14px',borderRadius:10,
                border:'1px solid rgba(255,255,255,0.15)',
                background:'rgba(255,255,255,0.06)',
                color:'rgba(255,255,255,0.7)',fontWeight:600,fontSize:13,
                cursor:'pointer',marginTop:4,transition:'background 0.15s'
              }}>
                ↩ Reset filtri
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{marginTop:'auto',paddingTop:20,borderTop:'1px solid rgba(255,255,255,0.08)',fontSize:11,color:'rgba(255,255,255,0.3)',textAlign:'center'}}>
        Aeroporto UDA · Parcheggio Admin
      </div>
    </section>
  )
}

export default SidebarFilters
