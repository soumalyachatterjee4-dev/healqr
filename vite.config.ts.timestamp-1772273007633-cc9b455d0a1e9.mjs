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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxoZWFscXIxXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxQcm9qZWN0c1xcXFxoZWFscXIxXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Qcm9qZWN0cy9oZWFscXIxL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY29weUZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB0YWlsd2luZGNzcygpLCAvLyBcdTIxOTAgVGFpbHdpbmQgQ1NTIHY0IHBsdWdpblxuICAgIHtcbiAgICAgIG5hbWU6ICdjb3B5LXN3JyxcbiAgICAgIGNsb3NlQnVuZGxlKCkge1xuICAgICAgICAvLyBDb3B5IHNlcnZpY2Ugd29ya2VyIHRvIGRpc3QgYWZ0ZXIgYnVpbGRcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb3B5RmlsZVN5bmMoJ3B1YmxpYy9maXJlYmFzZS1tZXNzYWdpbmctc3cuanMnLCAnZGlzdC9maXJlYmFzZS1tZXNzYWdpbmctc3cuanMnKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnXHUyNzA1IFNlcnZpY2Ugd29ya2VyIGNvcGllZCB0byBkaXN0LycpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgRmFpbGVkIHRvIGNvcHkgc2VydmljZSB3b3JrZXI6JywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLycpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgaG9zdDogdHJ1ZSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAvLyBTZXBhcmF0ZSB2ZW5kb3IgY2h1bmtzXG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LWhvb2stZm9ybSddLFxuICAgICAgICAgICd1aS1yYWRpeCc6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JywgJ0ByYWRpeC11aS9yZWFjdC10YWJzJ10sXG4gICAgICAgICAgJ2NoYXJ0cyc6IFsncmVjaGFydHMnXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlQLFNBQVMsb0JBQW9CO0FBQzlRLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFVBQVU7QUFDakIsU0FBUyxvQkFBb0I7QUFKN0IsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBO0FBQUEsSUFDWjtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sY0FBYztBQUVaLFlBQUk7QUFDRix1QkFBYSxtQ0FBbUMsK0JBQStCO0FBQy9FLGtCQUFRLElBQUksdUNBQWtDO0FBQUEsUUFDaEQsU0FBUyxLQUFLO0FBQ1osa0JBQVEsTUFBTSx5Q0FBb0MsR0FBRztBQUFBLFFBQ3ZEO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxJQUFJO0FBQUEsSUFDbkM7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBO0FBQUEsVUFFWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsaUJBQWlCO0FBQUEsVUFDeEQsWUFBWSxDQUFDLDBCQUEwQixpQ0FBaUMsMEJBQTBCLHNCQUFzQjtBQUFBLFVBQ3hILFVBQVUsQ0FBQyxVQUFVO0FBQUEsUUFDdkI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
