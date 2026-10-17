import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      /* The bindings import the Wails runtime by the URL the Go app answers
         it on (`/wails/runtime.js`). The bundler cannot fetch a URL, so it is
         pointed at the copy `wails3 generate runtime` writes next to them. */
      "/wails/runtime.js": resolve(import.meta.dirname, "bindings/runtime.js"),
    },
  },

  build: {
    outDir: "dist",
    /* Bundles go in static/ so they cannot be confused with - or overwrite -
       the files copied verbatim from public/assets. */
    assetsDir: "static",
  },

  server: {
    /* `wails3 dev` picks the port and exports it, then proxies every non-Wails
       request here. The fallback is the CLI's own default.

       The host is pinned to IPv4 because the proxy dials 127.0.0.1 explicitly
       and "localhost" can resolve to ::1 first, which it then cannot reach. */
    host: "127.0.0.1",
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
  },
});
