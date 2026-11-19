import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('node_modules')) {
      if (id.includes('@tanstack')) return 'query';
      if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//.test(id.replaceAll('\\','/'))) return 'react';
      if (id.includes('lucide-react')) return 'icons';
      if (id.includes('axios')) return 'http';
    }
  } } } },
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: [/(^|[\\/])\.chrome-qa[^\\/]*([\\/]|$)/, /(^|[\\/])\.ui-review([\\/]|$)/] },
    proxy: { '/api/v1': 'http://localhost:8080' }
  }
});
