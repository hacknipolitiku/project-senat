# Volby do senátu 2026

Webová stránka přibližující kandidáty do senátních voleb v České republice 2026 (iniciativa Milion chvilek).

Živá verze: https://hacknipolitiku.github.io/project-senat/

## Stránky

| Stránka            | URL                            |
| ------------------ | ------------------------------ |
| Úvodní mapa obvodů | `/`                            |
| Detail obvodu      | `/obvody/[slug]/`              |
| Detail kandidáta   | `/kandidati/[slug]/`           |

## Technologie

- [Astro](https://astro.build/) 6 – statický web, Content Collections
- TypeScript, Tailwind CSS 4
- Playwright (e2e testy)

## Instalace

Vyžaduje Node 22+ a pnpm.

```bash
pnpm install
```

Pro Hlídač státu je potřeba API token:

```bash
cp .env.example .env.local   # nebo vytvořit ručně
# Nastavit HLIDAC_STATU_TOKEN
```

## Vývoj

```bash
pnpm dev        # vývojový server na http://localhost:4321
pnpm build      # produkční build do dist/
pnpm preview    # náhled produkčního buildu na http://localhost:4322
pnpm fmt        # formátování (oxfmt)
```

### Testy

Testy běží proti produkčnímu buildu (port 4322), ne dev serveru.

```bash
npx playwright install --with-deps   # jednorázové nastavení
npx playwright test                  # všechny testy
npx playwright test tests/home.spec.ts        # jeden soubor
npx playwright test --grep "district"         # filtr podle názvu
```

## CLI

```bash
pnpm cli <příkaz>
```

| Příkaz | Popis |
| --- | --- |
| `map:process` | Zpracuje `data-raw/senate-map-wikipedia.svg` → `public/senate-map.svg`. Spustit jednorázově po změně zdrojového SVG. |
| `csv:import <soubor>` | Importuje kandidáty ze CSV (středníky, české desetinné čárky) do `data/candidates/`. Frontmatter se přepíše, tělo profilu a `hlidacStatuOsobaId` se zachovají. |
| `hlidac-statu:osoba <id> [-s]` | Stáhne data osoby z Hlídače státu. S `-s` uloží do `data/hlidac-statu/`. Vyžaduje `HLIDAC_STATU_TOKEN`. |
| `hlidac-statu:import` | Přestáhne data pro všechny kandidáty, kteří mají vyplněné `hlidacStatuOsobaId`. |

## Data

### Kandidáti

Zdrojové CSV: `data-raw/vsichni-platni-kandidati.csv`.

```bash
pnpm cli csv:import data-raw/vsichni-platni-kandidati.csv
```

Profily se ukládají do `data/candidates/{příjmení}-{jméno}-{obvod}-{číslo}.md`. Každý profil má YAML frontmatter (z CSV) a markdown tělo (kampaňové informace, Q&A – vyplňuje se ručně).

### SVG mapa

Zdrojový soubor `data-raw/senate-map-wikipedia.svg` se nikdy nemění. Zpracovaná verze `public/senate-map.svg` je vygenerovaná jednou a commitnutá do repozitáře:

```bash
pnpm cli map:process
```

### Hlídač státu

Data se stahují do `data/hlidac-statu/{osobaId}.json`. ID osoby se nastaví ručně v profilu kandidáta (`hlidacStatuOsobaId`).

## Nasazení

GitHub Pages, branch `main`. Základní URL je `/project-senat/` – konfigurováno v `astro.config.mjs`.
