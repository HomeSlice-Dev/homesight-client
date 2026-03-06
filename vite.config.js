import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy R2 asset requests through the dev server to avoid CORS issues
      // with html2canvas during PDF generation.
      // In production, add CORS headers to the R2 bucket instead.
      '/r2-proxy': {
        target: 'https://pub-633f8a68ce3b47509c3dc2e22ecfff28.r2.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/r2-proxy/, ''),
      },
    },
  },
})
