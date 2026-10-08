import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Aamaal',
        short_name: 'Aamaal',
        description: 'Namaz times, jamaat reminders and the Quran',
        theme_color: '#047857',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '/namaz',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Precache the app shell plus the Mushaf data & font so the Quran works fully offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Jamaat push notifications (push + notificationclick handlers)
        importScripts: ['push-sw.js'],
        // The only network call is saving reminder times (never cached)
        runtimeCaching: [],
      },
    }),
  ],
})
