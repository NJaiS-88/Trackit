import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend CORS only allows http://localhost:5173
    port: 5173,
    strictPort: true,
  },
})
