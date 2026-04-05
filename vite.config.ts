import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Dev-only: ensure health JSON is not swallowed by SPA fallback (production uses nginx + static file). */
function weddingPlannerHealthDev(): Plugin {
  const body = JSON.stringify({ status: 'ok', service: 'wedding-planner' })
  return {
    name: 'wedding-planner-health-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = req.url?.split('?')[0] ?? ''
        if (u === '/wedding-planner/health.json' || u.endsWith('/wedding-planner/health.json')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(body)
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
// Deployed at https://ai-vaerksted.cloud/wedding-planner/ (static SPA behind nginx).
export default defineConfig({
  base: '/wedding-planner/',
  plugins: [react(), weddingPlannerHealthDev()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        /** Split Konva only — splitting React caused circular chunk warnings with this dependency graph. */
        manualChunks(id) {
          if (id.includes('node_modules/konva/') || id.includes('node_modules\\konva\\')) return 'konva-vendor';
          if (id.includes('react-konva')) return 'konva-vendor';
        },
      },
    },
  },
})
