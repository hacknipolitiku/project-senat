# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Astro static site for Czech Senate elections 2026 (Milion chvilek initiative). Deployed to GitHub Pages at `https://hacknipolitiku.github.io/project-senat/`.

Requires Node 24 (see `.nvmrc`) — the CLI runs `.ts` files directly via Node's built-in type stripping.

## Commands

```bash
pnpm dev          # dev server at http://localhost:4321
pnpm build        # production build → dist/ (reads data/candidates.json)
pnpm preview      # preview production build
pnpm fmt          # format with oxfmt
pnpm fmt:check    # check formatting

# Build pipeline — two steps:
pnpm run data:prepare       # 1. download source CSV + preprocess → data/candidates.json
pnpm run build              # 2. astro build → dist/
pnpm run build:all          # both in sequence

# Tests (each build step is tested independently):
pnpm run test:unit          # node --test — download + preprocess logic (no deps, no network)
pnpm run test:e2e           # playwright — built site on port 4322
pnpm test                   # unit + e2e
npx playwright install --with-deps   # one-time setup for e2e
npx playwright test --grep "district"  # filter e2e by name
```

## Architecture

Two page types, both statically generated at build time:

- `src/pages/index.astro` — home with interactive SVG map and district legend
- `src/pages/obvody/[obvod].astro` — district detail listing candidates (`/obvody/decin/`)

There is **no candidate detail page** and **no external data fetching** (e.g. Hlídač státu) — all
candidate data comes from a single CSV file.

Data is served via **Astro Content Collections** (`src/content.config.ts`): `candidates` (loaded
from `data/candidates.json` via the `file()` loader) and `districts` (`data/districts.json`).
Pages call `getCollection()` / `getEntry()` from `astro:content`. `src/lib/data.ts` exports pure
utilities: `districtSlug()`, `formatCzechName()`, `getPartyLogoFiles()`.

## Build pipeline

All candidate data derives from one CSV. The pipeline is two steps: `data:prepare` (download +
preprocess) then `build`. The download and preprocess logic remain **separate pure modules** — the
combined step just calls them in sequence — so each is still unit-tested independently:

1. **Prepare** (`data:prepare` in `src/bin/cli.ts`) — calls, in order:
   - `downloadCsv(url, dest)` (`src/lib/download.ts`) — fetches the CSV and writes it to
     `data-raw/vsichni-platni-kandidati.csv`. The URL is never hardcoded: it comes from a CLI
     argument or `$CANDIDATES_CSV_URL`. The downloaded file is a build artifact (gitignored).
   - `preprocessCsvFile()` (`src/lib/preprocess.ts`) — `parseCandidatesCsv(csv)` (a pure function)
     parses the semicolon-separated, Czech-locale (`,` decimals) CSV into `Candidate[]`, then
     writes `data/candidates.json`.
2. **Build** — `astro build` reads `data/candidates.json`.

`data/candidates.json` is committed, so `pnpm run build` works standalone without downloading. The
`data:preprocess` CLI command (no download) regenerates it from a local CSV, e.g. the sample fixture.

Unit tests live next to their modules (`src/lib/*.test.ts`) and run with `node --test`. They cover
the download logic (with a stubbed global `fetch`) and CSV parsing (against an inline sample).
Playwright e2e tests in `tests/` exercise the built site.

Each `data/candidates.json` entry has `id` = `${districtId}-${candidateNumber}`, used as the
collection entry id. Fields: `districtId`, `candidateNumber`, `name`, `age`, `electoralParty`,
`nominatingParty`, `politicalAffiliation`, `occupation`, `residence`, `gender` (`"m"`/`"f"`);
optional `round1Votes`/`round1Percent`/`round2Votes`/`round2Percent`; and optional
`signedDeclaration` (bool), `hlidacStatuUrl`, `twitter` (handle), `instagram` (handle),
`showForm` (bool).

`gender` is **guessed from the name** by `guessGender()` (surname ending `-á` → female, else a
first name ending `-a` → female, else male; best-effort). It drives Czech word endings — e.g. the
declaration badge reads "Podepsal deklaraci" (m) vs "Podepsala deklaraci" (f).

**Column mapping**: `parseCandidatesCsv` maps CSV columns **by header name, not position**, via the
single `COLUMNS` map in `src/lib/preprocess.ts`. When the real CSV uses different header text,
update the strings there (and nothing else); an unmatched header just leaves its field
empty/omitted, and missing required columns (`districtId`/`candidateNumber`/`name`) log a warning.
Social handles accept `@handle`, `handle`, or a full profile URL (reduced to the bare handle);
`signedDeclaration`/`showForm` are truthy flags (`Ano`/`true`/`1`/`x`/…).

**Candidate sign-up form**: the "Zapojit se do kampaně" button (shown only when `showForm` — from
the CSV's "Zobrazit formulář" column — is truthy) links to a Google Form via `getCandidateFormUrl()`
in `src/lib/links.ts`, pre-filling the `kandidat` field with the candidate's full name. `GOOGLE_FORM_BASE` and `GOOGLE_FORM_KANDIDAT_ENTRY` there are
**placeholders** — fill in the real form URL and field entry id.

## SVG map

`public/senate-map.svg` is a preprocessed version of `data-raw/senate-map-wikipedia.svg` (the
original is never modified). Generate it once with `pnpm cli map:process` — it strips fixed
dimensions, removes text labels, and stamps `data-district-id="{id}"` on each of the 27 active
district `<path>` elements (matched via a hardcoded `DISTRICT_PATH` map in `src/lib/map.ts`).

At build time `CzechMap.astro` reads and inlines `public/senate-map.svg`. A client-side `<script>`
then adds `.s-active` and wires click/keyboard navigation using `data-district-id` and the district
slug map passed via `define:vars`.

## CLI

CLI commands (`pnpm cli <command>`):

- `data:prepare [url]` — download the source CSV (URL from argument or `$CANDIDATES_CSV_URL`) and preprocess it into `data/candidates.json`
- `data:preprocess [csv]` — preprocess a local CSV into `data/candidates.json` (no download)
- `map:process` — generate `public/senate-map.svg` from `data-raw/senate-map-wikipedia.svg`

## Key conventions

**Base URL**: Always use `import.meta.env.BASE_URL` for internal links — the site is deployed under `/project-senat/`, so bare `/` paths will break on production.

**URL pattern**: The district page uses a slug: `/obvody/{districtSlug}/` e.g. `/obvody/decin/`. Use `districtSlug(district.name)` (or `district.data.slug`) to construct links. District numeric IDs are still used for display (badge, `district.id`) but not in URLs.

**Name formatting**: Raw CSV names are `"Surname Firstname Titles"` (e.g. `"Sedláček Jiří Ing."`). Always pass through `formatCzechName()` before display — it reformats to `"[pre-titles] Firstname Surname[, post-titles]"`.

**Party logos**: SVG logos live in `public/logos/`. Use `getPartyLogoFiles(electoralParty)` to resolve logo filenames — it handles coalition names split on `+` and `·`.

**Election results**: `round1Votes > 0` means results are available. `round2Votes > 0` means the candidate reached round 2. The round-2 winner is the candidate with the highest `round2Votes` in the district.

## Key config

- `astro.config.mjs` — `site` and `base` path (`/project-senat/`)
- Tailwind CSS 4 via `@tailwindcss/vite` plugin (no `tailwind.config.*` file)
- Playwright tests target `http://localhost:4322/project-senat/` (preview server, not dev)
- Deploy: `.github/workflows/deploy.yml` runs `data:prepare` → `build`; if the repository
  variable `CANDIDATES_CSV_URL` is unset it falls back to the committed `data/candidates.json`.

## Districts (2026 cycle)

27 districts: 3 Cheb, 6 Louny, 9 Plzeň-město, 12 Strakonice, 15 Pelhřimov, 18 Příbram, 21 Praha 5, 24 Praha 9, 27 Praha 1, 30 Kladno, 33 Děčín, 36 Česká Lípa, 39 Trutnov, 42 Kolín, 45 Hradec Králové, 48 Rychnov nad Kněžnou, 51 Žďár nad Sázavou, 54 Znojmo, 57 Vyškov, 60 Brno-město, 63 Přerov, 66 Olomouc, 69 Frýdek-Místek, 72 Ostrava-město, 75 Karviná, 78 Zlín, 81 Uherské Hradiště.
