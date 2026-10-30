# Project setup

## Commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

## Phase 0 scope

The project uses Vite, React, TypeScript in strict mode, ESLint and Vitest.
The manifest and local SVG icon provide the PWA foundation. Service worker
registration and offline caching are intentionally deferred to TODO Phase 8.

The runtime uses only bundled assets: no CDN, remote font, analytics, tracking,
or external HTTP API is configured.
