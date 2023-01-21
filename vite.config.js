// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                screen: resolve(__dirname, 'screen.html'),
                controller: resolve(__dirname, 'controller.html'),
            },
        },
    },
})
