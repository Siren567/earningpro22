import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import path from "path"

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
        // Proxy Yahoo Finance requests to avoid CORS.
        '/api/yf': {
          target: 'https://query1.finance.yahoo.com',
          changeOrigin: true,
          rewrite: p => p.replace(/^\/api\/yf/, ''),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            'Accept': 'application/json',
          },
        },
        '/api/yf2': {
          target: 'https://query2.finance.yahoo.com',
          changeOrigin: true,
          rewrite: p => p.replace(/^\/api\/yf2/, ''),
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
        // FMP proxy — API key injected server-side, never in the JS bundle
        '/api/fmp': {
          target: 'https://financialmodelingprep.com',
          changeOrigin: true,
          rewrite: (p) => {
            const stripped = p.replace(/^\/api\/fmp/, '');
            const sep = stripped.includes('?') ? '&' : '?';
            return `${stripped}${sep}apikey=${fmpKey}`;
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
