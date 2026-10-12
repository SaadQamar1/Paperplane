import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync } from "node:fs";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-editor-assets",
      closeBundle() {
        cpSync(
          "node_modules/@excalidraw/excalidraw/dist/prod/fonts",
          "dist/fonts",
          { recursive: true },
        );
        cpSync("THIRD_PARTY_NOTICES.md", "dist/THIRD_PARTY_NOTICES.md");
        for (const [name, file] of [
          ["react", "LICENSE"],
          ["react-dom", "LICENSE"],
          ["lucide-react", "LICENSE"],
          ["idb-keyval", "LICENCE"],
        ]) {
          cpSync(`node_modules/${name}/${file}`, `dist/${name}-LICENSE.txt`);
        }
      },
    },
  ],
  base: "./",
  define: { "process.env.IS_PREACT": "false" },
});
