import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    open: false
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});
