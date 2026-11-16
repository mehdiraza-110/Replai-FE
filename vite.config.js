import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
// VERSION (repo root) is the release version, MAJOR.MINOR.PATCH.BUILD; every deploy bumps the last part.
var appVersion = fs.readFileSync(path.resolve(__dirname, "VERSION"), "utf8").trim();
export default defineConfig({
    define: { __APP_VERSION__: JSON.stringify(appVersion) },
    plugins: [react(), tailwindcss()],
});
