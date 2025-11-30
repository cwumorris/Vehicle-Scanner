import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    server: {
      host: '0.0.0.0',
      port: 3001,
      strictPort: true,

      // THIS FIXES THE "Blocked request" ERROR
      allowedHosts: [
        'app.squard24.com',
        'api.squard24.com',
        '.squard24.com',      // covers all subdomains
        'localhost',
        '127.0.0.1',
      ],

      // THIS CONNECTS FRONTEND → BACKEND THROUGH CLOUDFLARE
      proxy: {
        '/api': {
          target: 'https://api.squard24.com',   // Your real public backend
          changeOrigin: true,
          secure: true,                         // Required for HTTPS targets
          rewrite: (path) => path.replace(/^\/api/, '/api'), // keeps /api prefix
        },
      },
    },

    // Same settings for "npm run preview" (production-like server)
    preview: {
      host: '0.0.0.0',
      port: 3001,
      allowedHosts: [
        'app.squard24.com',
        'api.squard24.com',
        '.squard24.com',
        'localhost',
        '127.0.0.1',
      ],
    },

    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },

    build: {
      outDir: 'dist',
    },
  }
})
