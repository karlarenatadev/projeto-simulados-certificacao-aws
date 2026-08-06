import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  // Vite serve a partir de src/react — arquitetura React Clean
  root: 'src/react',

  build: {
    outDir: '../../dist/react',
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      // Permite imports curtos: '@/components/...' em vez de '../../../components/...'
      '@': resolve(__dirname, 'src/react'),
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Redireciona chamadas /api para o Express local
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
