import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/search": "http://127.0.0.1:8000",
      "/bookstores": "http://127.0.0.1:8000",
      "/auth": "http://127.0.0.1:8000",
      "/me": "http://127.0.0.1:8000",
      "/dashboard": "http://127.0.0.1:8000",
      "/catalog": "http://127.0.0.1:8000",
    },
  },
});
