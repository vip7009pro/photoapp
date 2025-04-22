import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/get_photos.php': {
        target: 'http://localhost/photo-app',
        changeOrigin: true,
      },
      '/upload.php': {
        target: 'http://localhost/photo-app',
        changeOrigin: true,
      },
      '/delete.php': {
        target: 'http://localhost/photo-app',
        changeOrigin: true,
      },
    },
  },
})
