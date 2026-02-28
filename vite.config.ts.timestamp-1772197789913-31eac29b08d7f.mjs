// vite.config.ts
import { defineConfig } from "file:///C:/Projects/healqr1/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Projects/healqr1/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Projects/healqr1/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
import { copyFileSync } from "fs";
var __vite_injected_original_dirname = "C:\\Projects\\healqr1";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // ← Tailwind CSS v4 plugin
    {
      name: "copy-sw",
      closeBundle() {
        try {
          copyFileSync("public/firebase-messaging-sw.js", "dist/firebase-messaging-sw.js");
          console.log("\u2705 Service worker copied to dist/");
        } catch (err) {
          console.error("\u274C Failed to copy service worker:", err);
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./")
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      /*
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-hook-form'],
          'ui-radix': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'charts': ['recharts']
        }
      }
      */
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxoZWFscXIxXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxoZWFscXIxXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Qcm9qZWN0cy9oZWFscXIxL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY29weUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB0YWlsd2luZGNzcygpLCAvLyBcdTIxOTAgVGFpbHdpbmQgQ1NTIHY0IHBsdWdpblxuICAgIHtcbiAgICAgIG5hbWU6ICdjb3B5LXN3JyxcbiAgICAgIGNsb3NlQnVuZGxlKCkge1xuICAgICAgICAvLyBDb3B5IHNlcnZpY2Ugd29ya2VyIHRvIGRpc3QgYWZ0ZXIgYnVpbGRcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb3B5RmlsZVN5bmMoJ3B1YmxpYy9maXJlYmFzZS1tZXNzYWdpbmctc3cuanMnLCAnZGlzdC9maXJlYmFzZS1tZXNzYWdpbmctc3cuanMnKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnXHUyNzA1IFNlcnZpY2Ugd29ya2VyIGNvcGllZCB0byBkaXN0LycpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRmFpbGVkIHRvIGNvcHkgc2VydmljZSB3b3JrZXI6JywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLycpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogdHJ1ZSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIC8qXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gU2VwYXJhdGUgdmVuZG9yIGNodW5rc1xuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1ob29rLWZvcm0nXSxcbiAgICAgICAgICAndWktcmFkaXgnOiBbJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLCAnQHJhZGl4LXVpL3JlYWN0LWRyb3Bkb3duLW1lbnUnLCAnQHJhZGl4LXVpL3JlYWN0LXNlbGVjdCcsICdAcmFkaXgtdWkvcmVhY3QtdGFicyddLFxuICAgICAgICAgICdjaGFydHMnOiBbJ3JlY2hhcnRzJ11cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgKi9cbiAgICB9XG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBaVAsU0FBUyxvQkFBb0I7QUFDOVEsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sVUFBVTtBQUNqQixTQUFTLG9CQUFvQjtBQUo3QixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUE7QUFBQSxJQUNaO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixjQUFjO0FBRVosWUFBSTtBQUNGLHVCQUFhLG1DQUFtQywrQkFBK0I7QUFDL0Usa0JBQVEsSUFBSSx1Q0FBa0M7QUFBQSxRQUNoRCxTQUFTLEtBQUs7QUFDWixrQkFBUSxNQUFNLHlDQUFvQyxHQUFHO0FBQUEsUUFDdkQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLElBQUk7QUFBQSxJQUNuQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQVdmO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
