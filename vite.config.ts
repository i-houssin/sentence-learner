import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The original Qwerty Learner Vite foundation, trimmed to a static, private-by-default client.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
  server: { host: '0.0.0.0' },
})
