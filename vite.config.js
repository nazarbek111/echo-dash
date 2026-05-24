import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: false
    },
    preview: {
        allowedHosts: [
            'echo-dash-production.up.railway.app'
        ]
    }
})