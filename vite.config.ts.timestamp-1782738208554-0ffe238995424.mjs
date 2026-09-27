// vite.config.ts
import { defineConfig } from "file:///C:/Users/Dell/Downloads/sasta-bazar/sasta-bazar-style-99468-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Dell/Downloads/sasta-bazar/sasta-bazar-style-99468-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/Dell/Downloads/sasta-bazar/sasta-bazar-style-99468-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\Dell\\Downloads\\sasta-bazar\\sasta-bazar-style-99468-main";
var ngrokPlugin = () => ({
  name: "ngrok-host-bypass",
  configureServer(server) {
    const middlewareStack = server.middlewares.stack || [];
    const hostCheckIndex = middlewareStack.findIndex((m) => {
      const handle = m.handle;
      return handle && (handle.toString().includes("Invalid Host header") || handle.toString().includes("checkHost") || handle.name === "viteCheckHost");
    });
    if (hostCheckIndex !== -1) {
      middlewareStack.splice(hostCheckIndex, 1);
    }
  }
});
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    // Listen on all interfaces
    port: 8081,
    strictPort: false,
    hmr: {
      clientPort: 443
    }
  },
  plugins: [
    react(),
    mode === "development" && ngrokPlugin(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEZWxsXFxcXERvd25sb2Fkc1xcXFxzYXN0YS1iYXphclxcXFxzYXN0YS1iYXphci1zdHlsZS05OTQ2OC1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEZWxsXFxcXERvd25sb2Fkc1xcXFxzYXN0YS1iYXphclxcXFxzYXN0YS1iYXphci1zdHlsZS05OTQ2OC1tYWluXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9EZWxsL0Rvd25sb2Fkcy9zYXN0YS1iYXphci9zYXN0YS1iYXphci1zdHlsZS05OTQ2OC1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5pbXBvcnQgdHlwZSB7IFBsdWdpbiB9IGZyb20gXCJ2aXRlXCI7XG5cbi8vIFBsdWdpbiB0byBjb21wbGV0ZWx5IGJ5cGFzcyBWaXRlJ3MgaG9zdCBjaGVjayBmb3Igbmdyb2tcbmNvbnN0IG5ncm9rUGx1Z2luID0gKCk6IFBsdWdpbiA9PiAoe1xuICBuYW1lOiAnbmdyb2staG9zdC1ieXBhc3MnLFxuICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgLy8gUmVtb3ZlIFZpdGUncyBob3N0IGNoZWNrIG1pZGRsZXdhcmUgY29tcGxldGVseVxuICAgIGNvbnN0IG1pZGRsZXdhcmVTdGFjayA9IChzZXJ2ZXIubWlkZGxld2FyZXMgYXMgYW55KS5zdGFjayB8fCBbXTtcbiAgICBjb25zdCBob3N0Q2hlY2tJbmRleCA9IG1pZGRsZXdhcmVTdGFjay5maW5kSW5kZXgoKG06IGFueSkgPT4ge1xuICAgICAgY29uc3QgaGFuZGxlID0gbS5oYW5kbGU7XG4gICAgICByZXR1cm4gaGFuZGxlICYmIChcbiAgICAgICAgaGFuZGxlLnRvU3RyaW5nKCkuaW5jbHVkZXMoJ0ludmFsaWQgSG9zdCBoZWFkZXInKSB8fFxuICAgICAgICBoYW5kbGUudG9TdHJpbmcoKS5pbmNsdWRlcygnY2hlY2tIb3N0JykgfHxcbiAgICAgICAgaGFuZGxlLm5hbWUgPT09ICd2aXRlQ2hlY2tIb3N0J1xuICAgICAgKTtcbiAgICB9KTtcbiAgICBcbiAgICBpZiAoaG9zdENoZWNrSW5kZXggIT09IC0xKSB7XG4gICAgICBtaWRkbGV3YXJlU3RhY2suc3BsaWNlKGhvc3RDaGVja0luZGV4LCAxKTtcbiAgICB9XG4gIH0sXG59KTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJywgLy8gTGlzdGVuIG9uIGFsbCBpbnRlcmZhY2VzXG4gICAgcG9ydDogODA4MSxcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcbiAgICBobXI6IHtcbiAgICAgIGNsaWVudFBvcnQ6IDQ0MyxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmIG5ncm9rUGx1Z2luKCksXG4gICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJlxuICAgIGNvbXBvbmVudFRhZ2dlcigpLFxuICBdLmZpbHRlcihCb29sZWFuKSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICB9LFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4WCxTQUFTLG9CQUFvQjtBQUMzWixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBT3pDLElBQU0sY0FBYyxPQUFlO0FBQUEsRUFDakMsTUFBTTtBQUFBLEVBQ04sZ0JBQWdCLFFBQVE7QUFFdEIsVUFBTSxrQkFBbUIsT0FBTyxZQUFvQixTQUFTLENBQUM7QUFDOUQsVUFBTSxpQkFBaUIsZ0JBQWdCLFVBQVUsQ0FBQyxNQUFXO0FBQzNELFlBQU0sU0FBUyxFQUFFO0FBQ2pCLGFBQU8sV0FDTCxPQUFPLFNBQVMsRUFBRSxTQUFTLHFCQUFxQixLQUNoRCxPQUFPLFNBQVMsRUFBRSxTQUFTLFdBQVcsS0FDdEMsT0FBTyxTQUFTO0FBQUEsSUFFcEIsQ0FBQztBQUVELFFBQUksbUJBQW1CLElBQUk7QUFDekIsc0JBQWdCLE9BQU8sZ0JBQWdCLENBQUM7QUFBQSxJQUMxQztBQUFBLEVBQ0Y7QUFDRjtBQUdBLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixLQUFLO0FBQUEsTUFDSCxZQUFZO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFNBQVMsaUJBQWlCLFlBQVk7QUFBQSxJQUN0QyxTQUFTLGlCQUNULGdCQUFnQjtBQUFBLEVBQ2xCLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
