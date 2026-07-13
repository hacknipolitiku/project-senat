# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Astro static site for Czech Senate elections 2026 (Milion chvilek initiative). Deployed to GitHub Pages at `https://hacknipolitiku.github.io/project-senat/`.

## Commands

```bash
pnpm dev          # dev server at http://localhost:4321
pnpm build        # production build → dist/
pnpm preview      # preview production build
pnpm fmt          # format with oxfmt
pnpm fmt:check    # check formatting

# E2e tests (run against a built preview server on port 4322, not dev):
npx playwright install --with-deps   # one-time setup
npx playwright test                  # all tests
npx playwright test tests/home.spec.ts  # single file
npx playwright test --grep "district"   # filter by name
```

## Architecture

Three pages, all statically generated at build time:

- `src/pages/index.astro` — home with interactive SVG map and district legend
- `src/pages/obvody/[obvod].astro` — district detail listing candidates (`/obvody/decin/`)
- `src/pages/kandidati/[kandidat].astro` — candidate detail (`/kandidati/sedlacek-jiri-3-1/`)

Data is served via **Astro Content Collections** (`src/content.config.ts`): `candidates` (`data/candidates/*.md`), `districts` (`data/districts.json`), `hlidac-statu` (`data/hlidac-statu/*.json`). Pages call `getCollection()` / `getEntry()` / `render()` from `astro:content`. `src/lib/data.ts` now only exports pure utilities: `districtSlug()`, `candidateFileSlug()`, `formatCzechName()`, `getPartyLogoFiles()`.

## SVG map

`public/senate-map.svg` is a preprocessed version of `data-raw/senate-map.svg` (the original is never modified). Generate it once with `pnpm cli map:process` — it strips fixed dimensions, removes text labels, and stamps `data-district-id="{id}"` on each of the 27 active district `<path>` elements (matched via a hardcoded `DISTRICT_PATH` map in `src/lib/map.ts`).

At build time `CzechMap.astro` reads and inlines `public/senate-map.svg`. A client-side `<script>` then adds `.s-active` and wires click/keyboard navigation using `data-district-id` and the district slug map passed via `define:vars`.

## Data pipeline

Source CSV: `data-raw/vsichni-platni-kandidati.csv` (semicolon-separated, Czech locale floats with `,`).

Run `pnpm cli csv:import <path-to-csv>` to regenerate `data/candidates/{slug}.md`. Frontmatter is always overwritten from CSV; the markdown body is preserved when the file already exists. Profiles are the canonical data store.

Profile filename format: `{surname-slug}-{firstname-slug}-{districtId}-{candidateNumber}.md`, e.g. `sedlacek-jiri-3-1.md`. The entry `id` in the collection equals this slug (filename without `.md`).

Profile file format:

```
---
districtId: 3
candidateNumber: 1
name: Sedláček Jiří Ing.
... (other CSV fields, votes/percent optional)
---

Body text here (campaign info, Q&A with ## headings)
```

CLI commands (`pnpm cli <command>`):

- `map:process` — generate `public/senate-map.svg` from `data-raw/senate-map.svg` (run once after SVG source changes)
- `csv:import <csv>` — import/update candidate profiles from a CSV file
- `hlidac-statu:osoba <osoba-id> [-s]` — fetch a single person from Hlídač státu (requires `HLIDAC_STATU_TOKEN`)
- `hlidac-statu:import` — re-fetch all persons whose profile has `hlidacStatuOsobaId` set

## Key conventions

**Base URL**: Always use `import.meta.env.BASE_URL` for internal links — the site is deployed under `/project-senat/`, so bare `/` paths will break on production.

**URL pattern**: Both pages use slugs — district: `/obvody/{districtSlug}/` e.g. `/obvody/decin/`; candidate: `/kandidati/{candidateSlug}/` e.g. `/kandidati/sedlacek-jiri-3-1/`. Use `districtSlug(district.name)` and `candidate.slug` to construct links. District numeric IDs are still used for display (badge, `district.id`) but not in URLs.

**Name formatting**: Raw CSV names are `"Surname Firstname Titles"` (e.g. `"Sedláček Jiří Ing."`). Always pass through `formatCzechName()` before display — it reformats to `"[pre-titles] Firstname Surname[, post-titles]"`.

**Party logos**: SVG logos live in `public/logos/`. Use `getPartyLogoFiles(electoralParty)` to resolve logo filenames — it handles coalition names split on `+` and `·`.

**Election results**: `round1Votes > 0` means results are available. `round2Votes > 0` means the candidate reached round 2. The round-2 winner is the candidate with the highest `round2Votes` in the district.

## Key config

- `astro.config.mjs` — `site` and `base` path (`/project-senat/`)
- Tailwind CSS 4 via `@tailwindcss/vite` plugin (no `tailwind.config.*` file)
- Playwright tests target `http://localhost:4322/project-senat/` (preview server, not dev)

## Districts (2026 cycle)

27 districts: 3 Cheb, 6 Louny, 9 Plzeň-město, 12 Strakonice, 15 Pelhřimov, 18 Příbram, 21 Praha 5, 24 Praha 9, 27 Praha 1, 30 Kladno, 33 Děčín, 36 Česká Lípa, 39 Trutnov, 42 Kolín, 45 Hradec Králové, 48 Rychnov nad Kněžnou, 51 Žďár nad Sázavou, 54 Znojmo, 57 Vyškov, 60 Brno-město, 63 Přerov, 66 Olomouc, 69 Frýdek-Místek, 72 Ostrava-město, 75 Karviná, 78 Zlín, 81 Uherské Hradiště.
