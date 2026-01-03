import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.BACKEND_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3001,
      strictPort: true,
      allowedHosts: ['host.docker.internal', 'localhost', '127.0.0.1'],
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/ws': {
          target,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: true,
      port: 3001,
      strictPort: true,
    },
  };
});
