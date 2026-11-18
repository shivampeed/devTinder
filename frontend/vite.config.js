import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.API_TARGET || 'http://localhost:7777'

const proxy = {
  // Same "/api" path as on Netlify, so the code and the login cookie behave the same locally and live
  '/api': {
    target: API_TARGET,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
  // Live chat traffic; ws: true lets the long-lived socket connection pass through too
  '/socket.io': {
    target: API_TARGET,
    changeOrigin: true,
    ws: true,
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    // On Netlify, BACKEND_URL is set, and chat must connect straight to it because
    // Netlify's forwarding can't carry live socket connections. Locally it stays empty
    // and chat goes through the Vite proxy above.
    __BACKEND_URL__: JSON.stringify((process.env.BACKEND_URL || '').trim().replace(/\/+$/, '')),
  },
  server: {
    port: 5173,
    proxy,
  },
  preview: {
    port: 4173,
    // vite preview serves the built app; it needs the same proxy to reach the API
    proxy,
  },
})
