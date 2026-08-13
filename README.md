# Volby do senátu 2026

Webová stránka přibližující kandidáty do senátních voleb v České republice 2026 (iniciativa Milion chvilek).

Živá verze: https://hacknipolitiku.github.io/project-senat/

## Stránky

| Stránka            | URL               |
| ------------------ | ----------------- |
| Úvodní mapa obvodů | `/`               |
| Detail obvodu      | `/obvody/[slug]/` |

Detail obvodu vypisuje kandidáty daného obvodu. Samostatná stránka kandidáta neexistuje.

## Technologie

- [Astro](https://astro.build/) 6 – statický web, Content Collections
- TypeScript, Tailwind CSS 4
- Playwright (e2e testy), `node --test` (unit testy)

## Instalace

Vyžaduje Node 24 (viz `.nvmrc`) a pnpm.

```bash
pnpm install
```

## Build pipeline

Veškerá data pocházejí z jednoho CSV souboru. Build má dva kroky:

```bash
pnpm run data:prepare       # 1. stáhne CSV a zpracuje ho → data/candidates.json
pnpm run build              # 2. sestaví Astro web → dist/

pnpm run build:all          # oba kroky za sebou
```

`data/candidates.json` (výstup kroku 1) je commitnutý v repozitáři, takže `pnpm run build`
funguje i bez stažení dat.

### 1. Prepare (download + preprocess)

```bash
pnpm run data:prepare <url>                       # explicitní URL
CANDIDATES_CSV_URL=<url> pnpm run data:prepare     # nebo z env proměnné
```

Stáhne zdrojové CSV do `data-raw/vsichni-platni-kandidati.csv` (build artefakt, v `.gitignore`)
a rovnou ho zpracuje. URL se nikdy nezadává natvrdo. CSV je oddělené středníky, s českými
desetinnými čárkami; výstupem je pole kandidátů v `data/candidates.json`, které načítá Astro
Content Collection (`src/content.config.ts`).

Přegenerování `data/candidates.json` z lokálního CSV bez stahování (např. z přiloženého vzorku):

```bash
pnpm cli data:preprocess [csv]      # výchozí vstup: data-raw/vsichni-platni-kandidati.csv
```

## Vývoj

```bash
pnpm dev        # vývojový server na http://localhost:4321
pnpm build      # produkční build do dist/
pnpm preview    # náhled produkčního buildu na http://localhost:4322
pnpm fmt        # formátování (oxfmt)
```

## Testy

Každý build krok se testuje samostatně:

```bash
pnpm run test:unit    # node --test – download a preprocess (bez závislostí, bez sítě)
pnpm run test:e2e     # playwright – sestavený web (port 4322)
pnpm test             # unit + e2e

# Jednorázové nastavení Playwrightu:
npx playwright install --with-deps
npx playwright test tests/home.spec.ts     # jeden soubor
npx playwright test --grep "district"      # filtr podle názvu
```

## CLI

```bash
pnpm cli <příkaz>
```

| Příkaz                  | Popis                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `data:prepare [url]`    | Stáhne zdrojové CSV a zpracuje ho do `data/candidates.json`. URL z argumentu nebo `$CANDIDATES_CSV_URL`. |
| `data:preprocess [csv]` | Zpracuje lokální CSV do `data/candidates.json` (bez stahování).                                          |
| `map:process`           | Zpracuje `data-raw/senate-map-wikipedia.svg` → `public/senate-map.svg`. Jednorázově po změně SVG.        |

## Data

### Kandidáti

Zdroj: jeden CSV soubor (Český statistický úřad). Krok `data:prepare` z něj vygeneruje
`data/candidates.json` – kanonický datový soubor, který web čte. Pole odpovídají sloupcům CSV:
obvod, číslo, jméno, věk, volební/navrhující strana, politická příslušnost, povolání, bydliště,
(volitelně) výsledky 1. a 2. kola a dále podepsání deklarace, URL na Hlídač státu, Twitter/X a
Instagram (handle) a příznak zobrazení formuláře.

Pohlaví (`gender` `m`/`f`) se **odhaduje ze jména** (`guessGender()`) – řídí české koncovky, např.
odznak „Podepsal deklaraci“ (m) vs „Podepsala deklaraci“ (ž).

Sloupce se mapují **podle názvu hlavičky, ne podle pořadí** – mapování je na jednom místě v
konstantě `COLUMNS` v `src/lib/preprocess.ts`. Když má reálné CSV jiné názvy sloupců, stačí upravit
tam. Tlačítko „Zapojit se do kampaně“ (zobrazí se podle sloupce „Zobrazit formulář“) vede na Google Form
(`getCandidateFormUrl()` v `src/lib/links.ts`) a předvyplní pole `kandidat` jménem kandidáta – URL formuláře a ID pole jsou zatím zástupné hodnoty
(placeholdery), doplní se později.

### SVG mapa

Zdrojový soubor `data-raw/senate-map-wikipedia.svg` se nikdy nemění. Zpracovaná verze
`public/senate-map.svg` je vygenerovaná jednou a commitnutá do repozitáře:

```bash
pnpm cli map:process
```

## Nasazení

GitHub Pages, branch `main`. Základní URL je `/project-senat/` – konfigurováno v `astro.config.mjs`.
Workflow spustí `data:prepare` → `build`. Pokud repozitářová proměnná `CANDIDATES_CSV_URL`
není nastavená, build použije commitnutý `data/candidates.json`.
