import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Deployed at https://ai-vaerksted.cloud/wedding-planner/ (static SPA behind nginx).
export default defineConfig({
  base: '/wedding-planner/',
  plugins: [react()],
})
