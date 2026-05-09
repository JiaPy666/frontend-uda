import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import fs from 'fs'
import path from 'path'

// =============================================================
//  Modalità HTTPS / HTTP selezionabile via variabile d'ambiente
//
//  Avvio HTTP:   npm run dev
//  Avvio HTTPS:  npm run dev:https
//
//  Certificati in: certs/localhost.pem · certs/localhost-key.pem
//  IP coperti:     localhost · 127.0.0.1 · 10.4.54.22
// =============================================================

const useHttps = process.env.VITE_HTTPS === 'true'

let httpsConfig = false

if (useHttps) {
  const certPath = path.resolve('./certs/localhost.pem')
  const keyPath  = path.resolve('./certs/localhost-key.pem')

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    httpsConfig = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
    console.log('\n🔒 Modalità HTTPS attiva (mkcert)')
    console.log('   https://localhost:5173')
    console.log('   https://127.0.0.1:5173')
    console.log('   https://10.4.54.22:5173\n')
  } else {
    console.warn('\n⚠️  Certificati mkcert non trovati → avvio in HTTP.')
    console.warn('   Esegui prima:  mkcert.exe -cert-file certs\\localhost.pem -key-file certs\\localhost-key.pem localhost 127.0.0.1 10.4.54.22\n')
  }
} else {
  console.log('\n🌐 Modalità HTTP attiva')
  console.log('   http://localhost:5173')
  console.log('   http://10.4.54.22:5173\n')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    https: httpsConfig,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
    https: httpsConfig,
  }
})
