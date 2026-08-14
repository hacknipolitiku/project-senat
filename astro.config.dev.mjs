import base from "./astro.config.mjs";

// Dev-only config for running the server INSIDE the sandbox while editing on
// the HOST. The repo is a virtiofs bind-mount and inotify events don't cross
// it, so the default watcher never sees host edits. Polling fixes that; the
// `ignored` list keeps polling off node_modules/.pnpm-store/etc. so startup
// doesn't hang. Extends the real config so `fonts` etc. stay in sync.
// Not committed — run with: astro dev --config astro.config.dev.mjs
base.vite = { ...(base.vite ?? {}) };
base.vite.server = {
  ...(base.vite.server ?? {}),
  watch: {
    usePolling: true,
    interval: 300,
    ignored: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/.pnpm-store/**",
      "**/.astro/**",
    ],
  },
};

export default base;
