import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],

      manifest: {
        name:             'Finance App',
        short_name:       'Finance',
        description:      'Controle financeiro pessoal',
        theme_color:      '#1B4F8A',
        background_color: '#0f172a',
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        scope:            '/',
        lang:             'pt-BR',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name:      'Nova Movimentação',
            short_name:'Nova',
            url:       '/transactions/new',
            icons:     [{ src: '/icons/shortcut-new.png', sizes: '96x96' }],
          },
          {
            name:      'Dashboard',
            short_name:'Dashboard',
            url:       '/',
            icons:     [{ src: '/icons/shortcut-home.png', sizes: '96x96' }],
          },
        ],
        screenshots: [
          {
            src:   '/screenshots/desktop.png',
            sizes: '1280x720',
            type:  'image/png',
            label: 'Dashboard',
            form_factor: 'wide',
          },
        ],
      },

      workbox: {
        // Cache de assets estáticos
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Estratégias de cache por rota
        runtimeCaching: [
          {
            // API — Network First: tenta rede, fallback em cache
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler:    'NetworkFirst',
            options: {
              cacheName:          'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries:    100,
                maxAgeSeconds: 5 * 60, // 5 minutos
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fontes Google — Cache First
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler:    'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],

        // Página offline customizada
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },

      devOptions: {
        enabled: false, // desabilita no dev para não interferir no HMR
      },
    }),
  ],

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir:    '../public/app',
    emptyOutDir: true,
  },
})
