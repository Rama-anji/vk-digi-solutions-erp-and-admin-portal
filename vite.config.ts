import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      fs: { deny: ['**/.storage/**', '**/api/config.local.php', '**/config.php', '**/.env*', '**/*.pem', '**/*.key'] },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1',
          changeOrigin: true,
          bypass: (req) => {
            if (req.url?.includes('raw') && /^\/api\/(setup|bootstrap|repository|actions|integrations|index|worker|whatsapp_webhook)\.php\?/.test(req.url)) return req.url;
          },
          rewrite: (url) => '/' + encodeURIComponent(path.basename(import.meta.dirname)) + url,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
