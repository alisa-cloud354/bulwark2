import { defineConfig } from "vite";

const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  build: {
    outDir: "dist",
  },
  server: {
    proxy: {
      "/api": {
        target: isProd
          ? "https://bulwark-fund.org"
          : "https://bulwark-eosin.vercel.app",
        changeOrigin: true,
      },
    },
  },
});
