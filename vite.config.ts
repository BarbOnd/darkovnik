import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    // One offline-cached bundle (React, DiceBear, dnd-kit) is intended; code splitting
    // would not save anything once the service worker has cached the app.
    chunkSizeWarningLimit: 700,
  },
  plugins: [
    react(),
    VitePWA({
      // Own service worker (src/sw/sw.ts): offline shell + Periodic Background Sync for reminders.
      strategies: "injectManifest",
      srcDir: "src/sw",
      filename: "sw.ts",
      // The app asks before activating a new version ("Je dostupná nová verze").
      registerType: "prompt",
      // Registered from React (virtual:pwa-register/react), not by an injected script.
      injectRegister: false,
      // Icons and the manifest are already matched by globPatterns; adding them again would duplicate entries.
      includeManifestIcons: false,
      injectManifest: {
        // manifest.webmanifest is added by the plugin itself.
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        rollupFormat: "iife",
      },
      manifest: {
        name: "Dárkovník",
        short_name: "Dárkovník",
        description: "Všechny dárky pod jednou mašlí. Osobní správce nápadů na dárky.",
        lang: "cs",
        // Relative, so the app works under any GitHub Pages base path.
        id: "./",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f8f6ff",
        theme_color: "#f8f6ff",
        // Installed app appears in the Android share sheet; a shared page opens quick add
        // prefilled (src/features/gifts/shareTarget.ts). GET, so it works offline too.
        share_target: {
          action: "./",
          method: "GET",
          params: { title: "title", text: "text", url: "url" },
        },
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icons/giftlist.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
