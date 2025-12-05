import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const resolveFromRoot = (...segments: string[]) =>
  path.resolve(__dirname, ...segments);

const plugins = [react(), tailwindcss(), jsxLocPlugin()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": resolveFromRoot("client", "src"),
      "@shared": resolveFromRoot("shared"),
      "@assets": resolveFromRoot("attached_assets"),
    },
  },
  envDir: resolveFromRoot("."),
  root: resolveFromRoot("client"),
  publicDir: resolveFromRoot("client", "public"),
  build: {
    outDir: resolveFromRoot("dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'recharts-vendor': ['recharts'],
          'trpc-vendor': ['@trpc/client', '@trpc/react-query', '@trpc/server'],
        },
      },
    },
    sourcemap: false, // Desabilitar sourcemap para evitar avisos
  },
  server: {
    host: true,
    hmr: {
      overlay: false,
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
