import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import * as path from 'path'
import { spaLoading } from 'vite-plugin-spa-loading'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(),tailwindcss(),spaLoading('text', {
    tipText: '正在加载......'
  })],
  resolve:{
    alias:{
      '@': path.resolve(__dirname, 'src'),
    }
  },
  server: {
    proxy: {
      // 代理所有 /api 开头的请求到后端服务器
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
