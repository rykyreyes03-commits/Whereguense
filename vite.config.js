import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Sin `workbox.runtimeCaching`: por default el plugin (estrategia
      // generateSW) solo precachea los archivos estaticos del build via
      // `globPatterns` -- no intercepta ninguna llamada de red en tiempo
      // de ejecucion. No agregar reglas de runtimeCaching para
      // supabase.co ni cartocdn.com: los sellos/negocios y las teselas
      // del mapa deben ir siempre a la red, nunca a una cache vieja.
      manifest: {
        name: 'Wheregüense',
        short_name: 'Wheregüense',
        lang: 'es-NI',
        description: 'Recorre la ciudad, sella tu pasaporte y colecciona la cultura de León.',
        theme_color: '#1E2A78',
        background_color: '#1E2A78',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
  },
  preview: {
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
  },
})
