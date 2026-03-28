// vite.config.ts
import { defineConfig } from "file:///C:/Projects/healqr%203/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Projects/healqr%203/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Projects/healqr%203/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
import { copyFileSync } from "fs";
var __vite_injected_original_dirname = "C:\\Projects\\healqr 3";
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
      output: {
        manualChunks: {
          // Separate vendor chunks
          "react-vendor": ["react", "react-dom", "react-hook-form"],
          "ui-radix": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select", "@radix-ui/react-tabs"],
          "charts": ["recharts"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxoZWFscXIgM1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcUHJvamVjdHNcXFxcaGVhbHFyIDNcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1Byb2plY3RzL2hlYWxxciUyMDMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBjb3B5RmlsZVN5bmMgfSBmcm9tICdmcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHRhaWx3aW5kY3NzKCksIC8vIFx1MjE5MCBUYWlsd2luZCBDU1MgdjQgcGx1Z2luXG4gICAge1xuICAgICAgbmFtZTogJ2NvcHktc3cnLFxuICAgICAgY2xvc2VCdW5kbGUoKSB7XG4gICAgICAgIC8vIENvcHkgc2VydmljZSB3b3JrZXIgdG8gZGlzdCBhZnRlciBidWlsZFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvcHlGaWxlU3luYygncHVibGljL2ZpcmViYXNlLW1lc3NhZ2luZy1zdy5qcycsICdkaXN0L2ZpcmViYXNlLW1lc3NhZ2luZy1zdy5qcycpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgU2VydmljZSB3b3JrZXIgY29waWVkIHRvIGRpc3QvJyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBGYWlsZWQgdG8gY29weSBzZXJ2aWNlIHdvcmtlcjonLCBlcnIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBob3N0OiB0cnVlLFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIFNlcGFyYXRlIHZlbmRvciBjaHVua3NcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3QtaG9vay1mb3JtJ10sXG4gICAgICAgICAgJ3VpLXJhZGl4JzogWydAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJywgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JywgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLCAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnXSxcbiAgICAgICAgICAnY2hhcnRzJzogWydyZWNoYXJ0cyddXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1AsU0FBUyxvQkFBb0I7QUFDblIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sVUFBVTtBQUNqQixTQUFTLG9CQUFvQjtBQUo3QixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUE7QUFBQSxJQUNaO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixjQUFjO0FBRVosWUFBSTtBQUNGLHVCQUFhLG1DQUFtQywrQkFBK0I7QUFDL0Usa0JBQVEsSUFBSSx1Q0FBa0M7QUFBQSxRQUNoRCxTQUFTLEtBQUs7QUFDWixrQkFBUSxNQUFNLHlDQUFvQyxHQUFHO0FBQUEsUUFDdkQ7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLElBQUk7QUFBQSxJQUNuQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUE7QUFBQSxVQUVaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxpQkFBaUI7QUFBQSxVQUN4RCxZQUFZLENBQUMsMEJBQTBCLGlDQUFpQywwQkFBMEIsc0JBQXNCO0FBQUEsVUFDeEgsVUFBVSxDQUFDLFVBQVU7QUFBQSxRQUN2QjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
