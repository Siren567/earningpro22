import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import path from "path"
import { PROXY_FORWARD_PARAM } from "./lib/proxyConstants.js"

/** Expand ?_fp=upstream/path into proxyReq path (same contract as Vercel api/yf.js). */
function devProxyExpandForwardParam(proxy) {
  proxy.on("proxyReq", (proxyReq, req) => {
    const url = new URL(req.url || "/", "http://localhost")
    const fp = url.searchParams.get(PROXY_FORWARD_PARAM)
    if (fp == null) return
    url.searchParams.delete(PROXY_FORWARD_PARAM)
    const qs = url.searchParams.toString()
    const destPath = `/${String(fp).replace(/^\/+/, "")}`
    proxyReq.path = qs ? `${destPath}?${qs}` : destPath
  })
}

export default defineConfig(({ mode }) => {
  // Load .env so non-VITE_ vars are accessible here (server-side only, never bundled)
  const env = loadEnv(mode, process.cwd(), '');
  const fmpKey      = env.FMP_API_KEY        || '';
  const supabaseUrl = env.VITE_SUPABASE_URL  || 'http://127.0.0.1:54321';

  return {
    base: '/',
    server: {
      allowedHosts: 'all',
      proxy: {
        // Proxy Yahoo Finance — browser calls /api/yf?_fp=v8%2F...&... ; dev expands _fp for query1.
        '/api/yf': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          configure: devProxyExpandForwardParam,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'application/json',
          },
        },
        '/api/yf2': {
          target: 'https://query2.finance.yahoo.com',
          changeOrigin: true,
          configure: devProxyExpandForwardParam,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'application/json',
          },
        },
        // Gako AI proxy — dev routes to VITE_SUPABASE_URL (production project).
        // Production: Vercel rewrite /api/gako/:path* → <SUPABASE_URL>/functions/v1/gako-:path*
        '/api/gako': {
          target:       supabaseUrl,
          changeOrigin: true,
          rewrite:      (p) => p.replace(/^\/api\/gako\//, '/functions/v1/gako-'),
        },
        // FMP — expand _fp then append apikey (single listener = order guaranteed).
        '/api/fmp': {
          target: 'https://financialmodelingprep.com',
          changeOrigin: true,
          configure(proxy) {
            proxy.on("proxyReq", (proxyReq, req) => {
              const url = new URL(req.url || "/", "http://localhost")
              const fp = url.searchParams.get(PROXY_FORWARD_PARAM)
              if (fp == null) return
              url.searchParams.delete(PROXY_FORWARD_PARAM)
              const destPath = `/${String(fp).replace(/^\/+/, "")}`
              const u = new URL(destPath + (url.search ? url.search : ""), "http://localhost")
              u.searchParams.set("apikey", fmpKey)
              const qs = u.searchParams.toString()
              proxyReq.path = qs ? `${u.pathname}?${qs}` : u.pathname
            })
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react()],
  };
});
