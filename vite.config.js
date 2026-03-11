import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      "/api": {
        target: "https://bulwark-eosin.vercel.app",
        changeOrigin: true,
      },
    },
  },
});
