import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    server: {
        host: '127.0.0.1',
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
                timeout: 300000, // 5 mins
                proxyTimeout: 300000 // 5 mins
            }
        }
    }
})
// Force restart timestamp: 2026-01-06T18:00:00
