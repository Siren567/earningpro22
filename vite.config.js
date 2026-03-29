import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import path from "path"

export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  server: {
    allowedHosts: 'all',
    proxy: {
      // Proxy Yahoo Finance requests to avoid CORS.
      // Vite forwards these server-side — no browser CORS restriction applies.
      '/api/yf': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/yf/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'application/json',
        },
      },
      '/api/yf2': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/yf2/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          'Accept': 'application/json',
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react()
  ]
})