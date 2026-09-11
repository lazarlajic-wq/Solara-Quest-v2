import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2021',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
    port: 5173,
  },
});
