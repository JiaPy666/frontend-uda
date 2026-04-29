/**
 * CONFIGURAZIONE API
 * ─────────────────────────────────────────────────────────────────
 * L'URL del backend viene risolto in questo ordine:
 *   1. Variabile d'ambiente VITE_API_URL (nel file .env)
 *   2. Proxy di Vite → "/api"  (funziona in sviluppo locale)
 *
 * Per usare l'app da un altro PC nella rete:
 *   - Apri il file .env nella cartella /frontend
 *   - Imposta: VITE_API_URL=http://<IP_DEL_SERVER>:5000/api
 *   - Riavvia il frontend con: npm run dev
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api'

// ─── Spots ────────────────────────────────────────────────────────

export async function getSpots() {
  const res = await fetch(`${API_BASE}/spots`)
  if (!res.ok) throw new Error('Errore nel caricamento dei posti')
  return res.json()
}

export async function updateSpot(spotId, spotData) {
  const res = await fetch(`${API_BASE}/spots/${spotId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spotData),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Errore nel salvataggio')
  }
  return res.json()
}

export async function reportFault(spotId, report) {
  const res = await fetch(`${API_BASE}/spots/${spotId}/fault`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ report }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Errore segnalazione')
  }
  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────────

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Credenziali non valide')
  return data
}

export async function register(name, email, password, phone, plate) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, phone, plate }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore registrazione')
  return data
}

// ─── Bookings ─────────────────────────────────────────────────────

export async function getBookings(userId) {
  const url = userId ? `${API_BASE}/bookings?user_id=${userId}` : `${API_BASE}/bookings`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Errore nel caricamento prenotazioni')
  return res.json()
}

export async function createBooking(payload) {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore prenotazione')
  return data
}

export async function cancelBooking(bookingId) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore cancellazione')
  return data
}

export async function extendBooking(bookingId, payload) {
  const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore estensione')
  return data
}

// ─── Stats / Coupon / Loyalty ──────────────────────────────────────

export async function validateCoupon(code) {
  const res = await fetch(`${API_BASE}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  return res.json()
}

export async function getVisitStats() {
  const res = await fetch(`${API_BASE}/stats/visits`)
  if (!res.ok) throw new Error('Errore statistiche')
  return res.json()
}

export async function getLoyalty(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}/loyalty`)
  if (!res.ok) return { loyalty_points: 0 }
  return res.json()
}

export async function updateUser(userId, payload) {
  const res = await fetch(`${API_BASE}/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore aggiornamento')
  return data
}

export async function getMaintenanceSchedule() {
  const res = await fetch(`${API_BASE}/maintenance/schedule`)
  if (!res.ok) return []
  return res.json()
}
