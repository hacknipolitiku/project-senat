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
- `src/pages/obvod/[id].astro` — district detail listing candidates
- `src/pages/kandidat/[obvod]/[kandidat].astro` — candidate detail with markdown profile

All data comes from `src/lib/data.ts`, which reads `data/profiles/` at build time (no JSON file — profiles are the source of truth). Key exports: `getCandidates()`, `getDistricts()`, `getDistrict(id)`, `getCandidate(districtId, candidateNumber)`, `formatCzechName()`, `getPartyLogoFiles()`, `getCandidateProfileSections()`.

## SVG map

`src/components/CzechMap.astro` reads `data-raw/senate-map.svg` at build time, strips fixed dimensions, removes text labels, then injects `class="s-active"` and `data-href` onto each of the 27 active district `<path>` elements (matched via a hardcoded `DISTRICT_PATH` map of district ID → SVG `path` element ID). Click navigation is wired via inline `<script>` in the component.

## Data pipeline

Source CSV: `data-raw/vsichni-platni-kandidati.csv` (semicolon-separated, Czech locale floats with `,`).

Run `node scripts/convert-csv.mjs` to regenerate `data/profiles/{districtId}/{candidateNumber}.md`. The script **always overwrites frontmatter** from CSV data, but **preserves the markdown body** when the file already exists (unless the body is the default placeholder). Profiles are the canonical data store — do not add a separate `data/candidates.json`.

Profile format:
```
---
districtId: 3
candidateNumber: 1
name: Sedláček Jiří Ing.
... (other CSV fields)
---

Body text here (campaign info, Q&A with ## headings)
```

## Key conventions

**Base URL**: Always use `import.meta.env.BASE_URL` for internal links — the site is deployed under `/project-senat/`, so bare `/` paths will break on production.

**Name formatting**: Raw CSV names are `"Surname Firstname Titles"` (e.g. `"Sedláček Jiří Ing."`). Always pass through `formatCzechName()` before display — it reformats to `"[pre-titles] Firstname Surname[, post-titles]"`.

**Party logos**: SVG logos live in `public/logos/`. Use `getPartyLogoFiles(electoralParty)` to resolve logo filenames — it handles coalition names split on `+` and `·`.

**Election results**: `round1Votes > 0` means results are available. `round2Votes > 0` means the candidate reached round 2. The round-2 winner is the candidate with the highest `round2Votes` in the district.

## Key config

- `astro.config.mjs` — `site` and `base` path (`/project-senat/`)
- Tailwind CSS 4 via `@tailwindcss/vite` plugin (no `tailwind.config.*` file)
- Playwright tests target `http://localhost:4322/project-senat/` (preview server, not dev)

## Districts (2026 cycle)

27 districts: 3 Cheb, 6 Louny, 9 Plzeň-město, 12 Strakonice, 15 Pelhřimov, 18 Příbram, 21 Praha 5, 24 Praha 9, 27 Praha 1, 30 Kladno, 33 Děčín, 36 Česká Lípa, 39 Trutnov, 42 Kolín, 45 Hradec Králové, 48 Rychnov nad Kněžnou, 51 Žďár nad Sázavou, 54 Znojmo, 57 Vyškov, 60 Brno-město, 63 Přerov, 66 Olomouc, 69 Frýdek-Místek, 72 Ostrava-město, 75 Karviná, 78 Zlín, 81 Uherské Hradiště.
