import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build in un unico file HTML (dist/index.html) apribile con doppio clic.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: { chunkSizeWarningLimit: 4000 },
});
