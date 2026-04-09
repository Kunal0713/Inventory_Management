import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️  Change 'stockflow' below to your exact GitHub repository name
//     e.g. if your repo is github.com/yourname/my-inventory → base: '/my-inventory/'
export default defineConfig({
  plugins: [react()],
  base: '/Inventory_Management/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
})
