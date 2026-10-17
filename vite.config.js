import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { parseHeadersFile } from './scripts/parse-headers.js'

// The same security headers Netlify will send (see public/_headers).
const siteHeaders = parseHeadersFile(readFileSync('public/_headers', 'utf8'))['/*']

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    // Lets us write `import x from '@/config/wedding'` instead of '../../config/wedding'
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // `npm run preview` serves the production build WITH the real CSP, so policy
  // mistakes show up locally instead of after deploying. (Not applied to
  // `npm run dev`, whose hot-reload needs inline scripts the CSP would block.)
  preview: { headers: siteHeaders },
  // Vitest reads this same file, so tests share the alias and Vue plugin.
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    // Vite also loads .env.local during tests. Blank the Supabase values so
    // tests can never touch the real database (≈ Laravel's .env.testing).
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
})
