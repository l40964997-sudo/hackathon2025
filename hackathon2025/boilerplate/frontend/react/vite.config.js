import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// API base configurable via env so the same image works in Docker and locally.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        // Inside docker compose the backend is reachable at http://python-backend:8000
        // From the browser we keep relative /api/* requests so this proxy handles them.
        target: process.env.VITE_API_TARGET || 'http://python-backend:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
