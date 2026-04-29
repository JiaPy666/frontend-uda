import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],

  server: {
    // Ascolta su tutte le interfacce di rete → raggiungibile da altri PC nella LAN
    host: '0.0.0.0',
    port: 5173,

    // Proxy: in sviluppo tutte le chiamate /api/... vanno al backend Flask
    // Cambia il target se il backend gira su un'altra macchina
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
  }
})
