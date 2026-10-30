# Project setup

Quick start; details are in `DEVELOPMENT.md`.

```bash
npm install
npm run dev        # http://localhost:5173 — development server, no service worker
npm run lint
npm test
npm run build      # TypeScript check (app, node config, service worker) + production build
npm run preview    # serves dist/ incl. service worker, offline mode and update banner
```

Stack: Vite, React, TypeScript (strict), ESLint, Vitest with fake-indexeddb, IndexedDB, `vite-plugin-pwa` with an own service worker (`src/sw/sw.ts`).

The runtime uses only bundled assets: no CDN, remote font, analytics, tracking, or external HTTP API.
