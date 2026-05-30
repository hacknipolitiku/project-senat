import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://hacknipolitiku.github.io',
  base: '/project-senat/',
  vite: {
    plugins: [tailwindcss()],
  },
});
