import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { groqApiPlugin } from './server/groqApi';
import { sqliteApiPlugin } from './server/sqliteApi';

const previewPort = Number(process.env.PORT) || 5000;

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    plugins: [groqApiPlugin(), sqliteApiPlugin(), react()],
    server: { host: '0.0.0.0', port: previewPort, strictPort: true, allowedHosts: true },
    preview: { host: '0.0.0.0', port: previewPort, strictPort: true, allowedHosts: true },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    optimizeDeps: { exclude: ['lucide-react'] },
  };
});
