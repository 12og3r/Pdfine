import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.GITHUB_ACTIONS ? '/Pdfine/' : '/',
  server: {
    watch: {
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/__tests__/**',
        '**/docs/**',
        '**/memory/**',
        '**/playwright-report/**',
        '**/test-results/**',
        '**/*.md',
      ],
    },
  },
})
