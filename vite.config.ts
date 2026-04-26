import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pets/**/*'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // 排除大量單字音檔（~90MB），改用瀏覽器 HTTP cache
        globIgnores: ['**/audio/**'],
        // 提高 precache 單檔上限（雖排除 audio，但保險）
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        name: '英文單字練習',
        short_name: '單字練習',
        description: '英文單字學習與測驗應用',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist'
  }
})
