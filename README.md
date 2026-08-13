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
pnpm run data:prepare       # 1. připraví data → data/candidates.json
pnpm run build              # 2. sestaví Astro web → dist/

pnpm run build:all          # oba kroky za sebou
```

`data/candidates.json` (výstup kroku 1) je commitnutý v repozitáři, takže `pnpm run build`
funguje i bez zdrojového CSV.

### 1. Prepare

`data:prepare` zpracuje zdrojové CSV do `data/candidates.json`. Zdroj je **buď / anebo**:

```bash
pnpm run data:prepare <url>                       # stáhne z explicitní URL
CANDIDATES_CSV_URL=<url> pnpm run data:prepare     # stáhne z env proměnné
pnpm run data:prepare                              # bez URL → použije commitnuté CSV v data-raw/
```

Když je zadaná URL, stáhne CSV do `data-raw/vsichni-platni-kandidati.csv` (build artefakt, v
`.gitignore`); jinak použije commitnutý soubor `data-raw/tabulka-novy-format.csv`. URL se nikdy
nezadává natvrdo. CSV je oddělené středníky (s uvozovkami kolem víceřádkových buněk); výstupem je
pole kandidátů, které načítá Astro Content Collection (`src/content.config.ts`).

Jen zpracování lokálního CSV bez stahování:

```bash
pnpm cli data:preprocess [csv]      # výchozí vstup: data-raw/tabulka-novy-format.csv
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

| Příkaz                  | Popis                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data:prepare [url]`    | Zpracuje zdrojové CSV do `data/candidates.json`. S URL (arg / `$CANDIDATES_CSV_URL`) ho nejdřív stáhne, jinak použije commitnuté CSV v `data-raw/`. |
| `data:preprocess [csv]` | Zpracuje lokální CSV do `data/candidates.json` (bez stahování).                                                                                     |
| `map:process`           | Zpracuje `data-raw/senate-map-wikipedia.svg` → `public/senate-map.svg`. Jednorázově po změně SVG.                                                   |

## Data

### Kandidáti

Zdroj: jeden CSV soubor. Krok `data:prepare` z něj vygeneruje `data/candidates.json` – kanonický
datový soubor, který web čte. Pole: obvod (z „Okres“), jméno (složené z příjmení/jména/titulů),
strana (`Nominace`), povolání, pohlaví, `supported` (z „Podporujeme?“); volitelně rok narození,
koalice (`Podpora`), podepsání deklarace, URL na Hlídač státu, Facebook, Instagram (handle) a web.

Pohlaví (`gender` `m`/`f`) se **odhaduje ze jména** (`guessGender()`) – řídí české koncovky, např.
odznak „Podepsal deklaraci“ (m) vs „Podepsala deklaraci“ (ž).

Sloupce se mapují **podle názvu hlavičky, ne podle pořadí** – mapování a parsování jednotlivých
sloupců je na jednom místě v registru `COLUMNS` v `src/lib/preprocess.ts` (každý sloupec má vlastní
`parse`). Když má reálné CSV jiné názvy sloupců, stačí upravit tam. CSV se čte správným parserem
(`parseCsvRows`), který zvládá uvozovky, víceřádkové buňky i středníky uvnitř URL.

Tlačítko „Zapojit se do kampaně“ se zobrazí jen u podporovaných kandidátů (`supported`) a vede na
Google Form (`getCandidateFormUrl()` v `src/lib/links.ts`), který předvyplní pole `kandidat` jménem
kandidáta – URL formuláře a ID pole jsou zatím zástupné hodnoty (placeholdery), doplní se později.

### SVG mapa

Zdrojový soubor `data-raw/senate-map-wikipedia.svg` se nikdy nemění. Zpracovaná verze
`public/senate-map.svg` je vygenerovaná jednou a commitnutá do repozitáře:

```bash
pnpm cli map:process
```

## Nasazení

GitHub Pages, branch `main`. Základní URL je `/project-senat/` – konfigurováno v `astro.config.mjs`.
Workflow spustí `data:prepare` → `build`. Pokud repozitářová proměnná `CANDIDATES_CSV_URL`
není nastavená, `data:prepare` zpracuje commitnuté CSV v `data-raw/`.
