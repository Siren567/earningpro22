# Vercel serverless API (flat routes)

Yahoo/FMP proxies are **single files** at the repo root of this folder — not nested `api/yf/...` directories.

| File       | HTTP route | Purpose                                      |
| ---------- | ---------- | -------------------------------------------- |
| `yf.js`    | `/api/yf`  | Yahoo `query1` — pass path in `?_fp=`      |
| `yf2.js`   | `/api/yf2` | Yahoo `query2` — same `?_fp=` contract       |
| `fmp.js`   | `/api/fmp` | Financial Modeling Prep — `?_fp=` + apikey |

Upstream paths (e.g. `v8/finance/chart/AAPL`) must **not** be URL path segments after `/api/yf/`; Vercel matches only one segment. Use:

`/api/yf?_fp=v8%2Ffinance%2Fchart%2FAAPL&interval=1d&range=5d`

Shared helpers (not routes): `../lib/apiProxyShared.js`, `../lib/proxyConstants.js`.
