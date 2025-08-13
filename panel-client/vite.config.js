import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: resolve(__dirname, '../server/public'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  server: {
    proxy: {
      // Proxy API calls to the Express server during development
      '/api': 'http://localhost:3000',
      '/grpc-web': 'http://localhost:3000',
    }
  }
});