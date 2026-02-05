import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← Tailwind CSS v4 plugin
    {
      name: 'copy-sw',
      closeBundle() {
        // Copy service worker to dist after build
        try {
          copyFileSync('public/firebase-messaging-sw.js', 'dist/firebase-messaging-sw.js');
          console.log('✅ Service worker copied to dist/');
        } catch (err) {
          console.error('❌ Failed to copy service worker:', err);
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-hook-form'],
          'ui-radix': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'charts': ['recharts']
        }
      }
    }
  },
});
