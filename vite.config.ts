import { defineConfig } from 'vite'

// Relative asset paths so the same build works at a domain root or a sub-path
// (GitHub Pages serves it from /idea-generator/).
export default defineConfig({
  base: './',
})
