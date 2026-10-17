/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const REAL_CLIENT = fileURLToPath(new URL('./src/lib/supabase.ts', import.meta.url))
const DEMO_CLIENT = fileURLToPath(new URL('./src/demo/supabaseModule.ts', import.meta.url))

/** Na versão de teste, troca o cliente do Supabase pelo banco em memória. */
function demoBackend(): Plugin {
  return {
    name: 'bruceapp-demo-backend',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!source.endsWith('supabase') || !importer) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved?.id === REAL_CLIENT ? DEMO_CLIENT : null
    },
  }
}

export default defineConfig(({ mode }) => ({
  // A versão de teste roda em qualquer pasta (caminhos relativos) e sem service worker.
  base: mode === 'demo' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === 'demo' ? [demoBackend()] : []),
    VitePWA({
      disable: mode === 'demo',
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Bruceapp',
        short_name: 'Bruce',
        description: 'Treino, alimentação, hábitos e evolução em um só lugar.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#090A0D',
        theme_color: '#090A0D',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        // Recebe e mostra as notificações de lembrete (Web Push).
        importScripts: ['push-sw.js'],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas grandes em arquivos próprios: mudam pouco e ficam em cache entre versões.
        codeSplitting: {
          groups: [
            { name: 'supabase', test: /node_modules[\\/]@supabase/ },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: 'query', test: /node_modules[\\/](@tanstack|zod)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
}))
