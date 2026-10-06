import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '../../..');

// Sirve la página de prueba con el Supabase simulado en lugar del cliente real.
export default defineConfig({
  root: aqui,
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^(\.\.\/)+lib\/supabaseClient$/, replacement: path.join(aqui, 'supabaseMock.js') },
      { find: /^\/src\//, replacement: `${raiz.replace(/\\/g, '/')}/src/` },
    ],
  },
  server: { port: 5199, strictPort: true, fs: { allow: [raiz] } },
});
