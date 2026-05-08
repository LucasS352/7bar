import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// ============================================================
//  Vite + React + PWA Config — 7bar PDV
//  Substitui next.config.ts na migração para Vite
// ============================================================

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // 'autoUpdate' registra e atualiza o SW automaticamente
      registerType: 'autoUpdate',

      // Inclui workbox no bundle do dev (hotjar logs de cache)
      devOptions: { enabled: true },

      // Ponto de entrada do manifest
      manifest: {
        name: '7bar — Ponto de Venda',
        short_name: '7bar POS',
        description: 'PDV para Adegas e Distribuidoras com suporte offline',
        theme_color: '#0a0a0a',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['business', 'productivity'],
      },

      // ── Workbox — Estratégias de Cache ──────────────────────────────────────
      workbox: {
        // Pré-cacheia todos os assets do build (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Sem limite de tamanho para o precache (bundle pode ser grande)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB

        runtimeCaching: [
          // ── Network First: API crítica (produtos, caixa) ─────────────────
          // Tenta a rede primeiro; se falhar, serve do cache
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/products') ||
              url.pathname.startsWith('/api/cash-registers'),
            handler: 'NetworkFirst',
            options: {
              cacheName: '7bar-api-critical',
              networkTimeoutSeconds: 5, // timeout antes de cair pro cache
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24h
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Stale-While-Revalidate: Assets estáticos ─────────────────────
          // Serve do cache imediatamente, atualiza em background
          {
            urlPattern: ({ request }) =>
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: '7bar-static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
            },
          },

          // ── Cache First: Fontes e imagens ─────────────────────────────────
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' ||
              request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: '7bar-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      // Mantém o alias @/ usado em todo o código existente
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 3000,
    // Proxy: redireciona /api/* para o backend NestJS em localhost:3520
    proxy: {
      '/api': {
        target: 'http://localhost:3520',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Code splitting para melhor performance de cache
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          store:  ['zustand'],
          ui:     ['lucide-react', 'framer-motion'],
          db:     ['dexie'],
        },
      },
    },
  },
});
