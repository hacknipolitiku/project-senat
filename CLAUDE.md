# CLAUDE.md

## Project

Astro static site for Czech Senate elections 2026. Deployed to GitHub Pages at `https://valekjo.github.io/senat-2026-web/`.

## Commands

```bash
npm run dev       # dev server at http://localhost:4321
npm run build     # production build → dist/
npm run preview   # preview production build
npx playwright test  # e2e tests (requires: npx playwright install --with-deps)
```

## Architecture

- `src/pages/index.astro` — home page with SVG district map (`src/components/CzechMap.astro`)
- `src/pages/obvod/[id].astro` — district detail, lists candidates
- `src/pages/kandidat/[obvod]/[id].astro` — candidate detail
- `src/layouts/` — shared layouts
- `src/lib/` — data loading utilities
- `data/candidates.json` — generated candidate data (do not edit manually)
- `data/profiles/` — per-candidate markdown profiles (generated)
- `data-raw/` — source CSVs
- `scripts/convert-csv.mjs` — converts `data-raw/` → `data/`

## Data pipeline

Source data lives in `data-raw/`. Run `node scripts/convert-csv.mjs` to regenerate `data/candidates.json` and `data/profiles/`.

## Key config

- `astro.config.mjs` — site URL and base path
- `tsconfig.json` — TypeScript config
- Tailwind CSS 4 via `@tailwindcss/vite` plugin (no `tailwind.config.*` file)

## Districts (2026 cycle)

27 districts: 3 Cheb, 6 Louny, 9 Plzeň-město, 12 Strakonice, 15 Pelhřimov, 18 Příbram, 21 Praha 5, 24 Praha 9, 27 Praha 1, 30 Kladno, 33 Děčín, 36 Česká Lípa, 39 Trutnov, 42 Kolín, 45 Hradec Králové, 48 Rychnov nad Kněžnou, 51 Žďár nad Sázavou, 54 Znojmo, 57 Vyškov, 60 Brno-město, 63 Přerov, 66 Olomouc, 69 Frýdek-Místek, 72 Ostrava-město, 75 Karviná, 78 Zlín, 81 Uherské Hradiště.
