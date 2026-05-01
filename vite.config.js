import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // Allow fallback to another port if 5173 is in use
    host: true, // Listen on all addresses (0.0.0.0)
    open: false, // Disable auto-open (causes xdg-open error on Linux)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('[vite] Proxy error:', err.message);
          });
        }
      }
    }
  },
  build: {
    outDir: 'build',
    sourcemap: true
  }
})
