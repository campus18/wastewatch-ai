import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev: the browser talks only to Vite (same origin); /api and /uploads are proxied to the API.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000', '/uploads': 'http://localhost:4000' } },
});
