import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://hacknipolitiku.github.io",
  base: "/project-senat/",
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Barlow",
      cssVariable: "--font-barlow",
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      // latin-ext is required for Czech diacritics (ř, š, č, ž, ů, …).
      subsets: ["latin", "latin-ext"],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
