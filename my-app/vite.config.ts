import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    // Tailwind v4 runs through its own Vite plugin, so no PostCSS pipeline is
    // needed. An inline (empty) config also stops Vite from walking up and
    // picking up an unrelated postcss.config.js from a parent directory.
    postcss: {},
  },
})
