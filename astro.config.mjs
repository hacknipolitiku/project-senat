import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://valekjo.github.io',
  base: '/senat-2026-web/',
  vite: {
    plugins: [tailwindcss()],
  },
});
