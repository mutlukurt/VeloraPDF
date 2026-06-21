import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("pdfjs-dist")) return "vendor-pdfjs";
          if (id.includes("jspdf") || id.includes("pdf-lib")) return "vendor-pdf-export";
          if (id.includes("html2canvas") || id.includes("dompurify") || id.includes("canvg")) return "vendor-canvas";
          if (id.includes("jszip")) return "vendor-jszip";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "vendor-editor";
          if (id.includes("framer-motion") || id.includes("/motion")) return "vendor-motion";
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/") ||
            id.includes("/node_modules/react/jsx-runtime")
          ) {
            return "vendor-react";
          }
          return "vendor";
        },
      },
    },
  },
});
