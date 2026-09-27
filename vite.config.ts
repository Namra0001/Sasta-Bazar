import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

// Plugin to completely bypass Vite's host check for ngrok
const ngrokPlugin = (): Plugin => ({
  name: 'ngrok-host-bypass',
  configureServer(server) {
    // Remove Vite's host check middleware completely
    const middlewareStack = (server.middlewares as any).stack || [];
    const hostCheckIndex = middlewareStack.findIndex((m: any) => {
      const handle = m.handle;
      return handle && (
        handle.toString().includes('Invalid Host header') ||
        handle.toString().includes('checkHost') ||
        handle.name === 'viteCheckHost'
      );
    });
    
    if (hostCheckIndex !== -1) {
      middlewareStack.splice(hostCheckIndex, 1);
    }
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: '0.0.0.0', // Listen on all interfaces
    port: 8081,
    strictPort: false,
    hmr: {
      clientPort: 443,
    },
  },
  plugins: [
    react(),
    mode === 'development' && ngrokPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
