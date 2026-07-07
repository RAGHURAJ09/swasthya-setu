import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Swasthya Setu',
        short_name: 'Swasthya',
        description: 'District Health Command Center',
        theme_color: '#0ea5e9',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    open: true,
    port: 5173,
  },
  optimizeDeps: {
    include: ['leaflet', 'react-leaflet'],
  },
  define: {
    global: 'window',
  },
})

