import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// ============================================================
//  Vite + React + PWA Config — PDV Pro
//  Substitui next.config.ts na migração para Vite
// ============================================================

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // 'autoUpdate' instala e ativa o novo SW imediatamente sem prompt
      registerType: 'autoUpdate',

      // Força o novo SW a ativar e assumir controle sem esperar a próxima visita
      injectManifest: false,

      // Ponto de entrada do manifest
      manifest: {
        name: 'PDV Pro — Ponto de Venda',
        short_name: 'PDV Pro',
        description: 'Sistema de Ponto de Venda profissional com suporte offline',
        theme_color: '#0a0a0a',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          }
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
              cacheName: 'pdvpro-api-critical',
              networkTimeoutSeconds: 5, // timeout antes de cair pro cache
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24h
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

        // ── Stale-While-Revalidate: fontes (NÃO scripts — o precache já versiona JS)
          {
            urlPattern: ({ request }) =>
              request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pdvpro-styles',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
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
              cacheName: 'pdvpro-assets',
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
        // Vite 8 (Rolldown) exige manualChunks como função, não objeto
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) return 'vendor';
          if (id.includes('zustand'))           return 'store';
          if (id.includes('lucide-react') || id.includes('framer-motion')) return 'ui';
          if (id.includes('dexie'))             return 'db';
          return undefined;
        },
      },
    },
  },
});
