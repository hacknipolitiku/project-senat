# Volby do senátu 2026

Webová stránka přibližující kandidáty do senátních voleb v České republice 2026.

Živá verze: https://valekjo.github.io/senat-2026-web/

## Stránky

| Stránka | URL |
|---|---|
| Úvodní mapa obvodů | `/` |
| Detail obvodu | `/obvod/[id]` |
| Detail kandidáta | `/kandidat/[obvod]/[id]` |

## Data

Zdrojová data jsou ve složce `data-raw/`. Skript `scripts/convert-csv.mjs` je převede do `data/candidates.json` a profilů v `data/profiles/`.

```
npm run build   # nebo: node scripts/convert-csv.mjs
```

## Vývoj

```bash
npm install
npm run dev       # vývojový server na http://localhost:4321
npm run build     # produkční build do dist/
npm run preview   # náhled produkčního buildu
```

### Testy

```bash
npx playwright install --with-deps
npx playwright test
```

## Nasazení

Stránka se nasazuje na GitHub Pages do `https://valekjo.github.io/senat-2026-web/`. Základní URL je konfigurována v `astro.config.mjs`.

## Technologie

- [Astro](https://astro.build/) 6.4.2
- TypeScript
- Tailwind CSS 4
- Playwright (e2e testy)
- Node 24
