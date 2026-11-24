import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the API runs on :8000; in Docker, nginx proxies these paths instead.
const api = "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": api, "/docs": api, "/openapi.json": api } },
});
