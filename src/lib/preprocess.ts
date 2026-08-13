import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Committed source CSV, used when no download URL is provided. */
export const DEFAULT_CSV_SRC = "data-raw/tabulka-novy-format.csv";
/** The single data file the Astro build consumes. */
export const DEFAULT_JSON_DEST = "data/candidates.json";

export interface Candidate {
  /** Collection entry id: `${districtId}-${candidateNumber}`. */
  id: string;
  districtId: number;
  /** Per-district running index in CSV order — NOT an official ballot number. */
  candidateNumber: number;
  /** "Surname Firstname Titles" — always pass through formatCzechName() to display. */
  name: string;
  /** Nominating party ("Nominace") — drives the party logo. */
  electoralParty: string;
  occupation: string;
  /** Guessed from the name: "m" male, "f" female (drives Czech word endings). */
  gender: "m" | "f";
  /** "Podporujeme?" = Ano — whether the initiative backs this candidate. */
  supported: boolean;
  birthYear?: number;
  /** Supporting parties / coalition ("Podpora"). */
  coalition?: string;
  signedDeclaration?: boolean;
  hlidacStatuUrl?: string;
  facebook?: string;
  instagram?: string;
  web?: string;
}

/** Working draft filled column-by-column before a Candidate is finalized. */
interface RowDraft {
  districtId?: number;
  surname?: string;
  firstName?: string;
  titles?: string;
  electoralParty?: string;
  occupation?: string;
  birthYear?: number;
  coalition?: string;
  supported?: boolean;
  signedDeclaration?: boolean;
  hlidacStatuUrl?: string;
  facebook?: string;
  instagram?: string;
  web?: string;
}

/** Strip BOM, zero-width spaces and surrounding whitespace from a CSV cell. */
function clean(s: string): string {
  return (s ?? "").replace(/^﻿/, "").replace(/​/g, "").trim();
}

/** Normalize a header for tolerant matching (folds embedded newlines/spaces). */
function normalizeHeader(s: string): string {
  return clean(s).toLowerCase().replace(/\s+/g, " ");
}

const TRUTHY = new Set(["ano", "true", "1", "yes", "y"]);

/** Interpret a cell as a boolean flag ("Ano"/"true"/"1"; "0"/"NE"/"čekáme"/… are false). */
function parseBool(s: string): boolean {
  return TRUTHY.has(clean(s).toLowerCase());
}

/** "0" is used as a "none" sentinel across several columns. */
function cleanSentinel(s: string): string {
  const v = clean(s);
  return v === "0" ? "" : v;
}

/** Return the cell only if it is an http(s) URL, else "". */
function asUrl(s: string): string {
  const v = cleanSentinel(s);
  return /^https?:\/\//i.test(v) ? v : "";
}

/** Reduce "@handle", "handle" or a full profile URL to a bare handle ("0" → ""). */
function asHandle(s: string): string {
  const v = cleanSentinel(s).replace(/\/+$/, "");
  if (!v) return "";
  const fromUrl = v.match(/(?:x\.com|twitter\.com|instagram\.com)\/(?:#!\/)?@?([^/?#]+)/i);
  return (fromUrl ? fromUrl[1] : v).replace(/^@/, "");
}

/** Leading district id from "3 – Cheb" (en dash or hyphen). NaN if absent. */
function parseDistrictId(s: string): number {
  return parseInt(clean(s));
}

/** First 4-digit year found ("1977" or "12. 3. 1965" → 1977/1965). */
function parseYear(s: string): number | undefined {
  const m = clean(s).match(/(\d{4})/);
  return m ? parseInt(m[1]) : undefined;
}

/** Common Czech male given names ending in "-a" (so they aren't read as female). */
const MALE_A_NAMES = new Set([
  "ilja",
  "nikita",
  "kuba",
  "honza",
  "sáva",
  "nikola",
  "aljoša",
  "attila",
  "barnaba",
  "kája",
  "ondra",
]);

/**
 * Guess a candidate's gender from the raw "Surname Firstname Titles" name.
 * Heuristic: a surname ending in "-á" (the feminine adjectival form, e.g.
 * "-ová") is female; otherwise a first name ending in "-a" (excluding known
 * male names) is female; everything else defaults to male. Best-effort only.
 */
export function guessGender(rawName: string): "m" | "f" {
  const nameTokens = clean(rawName)
    .split(/\s+/)
    .map((t) => t.replace(/,+$/, ""))
    .filter((t) => t && !/\.$/.test(t) && !/^(mba|dis|dsc|llm|msc|dba|mpa|csc)$/i.test(t));
  if (nameTokens.length === 0) return "m";

  const surname = nameTokens[0].toLowerCase();
  const firstName = nameTokens[nameTokens.length - 1].toLowerCase();

  if (/á$/.test(surname)) return "f";
  if (/a$/.test(firstName) && !MALE_A_NAMES.has(firstName)) return "f";
  return "m";
}

/**
 * Per-column importers. Each entry names the CSV column header it reads and
 * writes the parsed value into the row draft. Columns are matched by header
 * name (case-insensitive, whitespace-collapsed), NOT by position — so a
 * reordered CSV still imports correctly, and unlisted columns (Média, Kontakt)
 * are simply ignored. When the real CSV renames a column, update the header
 * string here (and nothing else).
 */
const COLUMNS: { header: string; apply: (d: RowDraft, raw: string) => void }[] = [
  { header: "Okres", apply: (d, v) => (d.districtId = parseDistrictId(v)) },
  { header: "Podporujeme? (Ano/Ne)", apply: (d, v) => (d.supported = parseBool(v)) },
  { header: "Příjmení", apply: (d, v) => (d.surname = clean(v)) },
  { header: "Jméno", apply: (d, v) => (d.firstName = clean(v)) },
  { header: "Tituly", apply: (d, v) => (d.titles = clean(v)) },
  { header: "Datum narození", apply: (d, v) => (d.birthYear = parseYear(v)) },
  { header: "Povolání", apply: (d, v) => (d.occupation = clean(v)) },
  { header: "Nominace", apply: (d, v) => (d.electoralParty = clean(v)) },
  { header: "Podpora", apply: (d, v) => (d.coalition = cleanSentinel(v) || undefined) },
  { header: "Hlídač státu", apply: (d, v) => (d.hlidacStatuUrl = asUrl(v) || undefined) },
  { header: "FB", apply: (d, v) => (d.facebook = asUrl(v) || undefined) },
  { header: "Insta", apply: (d, v) => (d.instagram = asHandle(v) || undefined) },
  { header: "Web", apply: (d, v) => (d.web = asUrl(v) || undefined) },
  {
    header: "Podepsána Deklarace?",
    apply: (d, v) => (d.signedDeclaration = parseBool(v) || undefined),
  },
];

/** Headers without which a row cannot be built. */
const REQUIRED_HEADERS = ["Okres", "Příjmení", "Jméno"];

/**
 * Tokenize CSV text into rows of cells, honouring RFC-4180 quoting: quoted
 * fields may contain the delimiter, newlines, and "" escaped quotes. Needed
 * because the source has multi-line headers and semicolons inside quoted URLs.
 */
export function parseCsvRows(text: string, delimiter = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\r") {
      // ignore; handled by \n
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Parse the semicolon-separated candidates CSV (with a header row) into
 * Candidate objects. Pure function — no filesystem access, so it can be
 * unit-tested against an inline sample.
 */
export function parseCandidatesCsv(csv: string): Candidate[] {
  const rows = parseCsvRows(csv).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length === 0) return [];

  const headerIndex = new Map<string, number>();
  rows[0].forEach((h, i) => {
    const key = normalizeHeader(h);
    if (!headerIndex.has(key)) headerIndex.set(key, i);
  });
  const indexOf = (header: string) => headerIndex.get(normalizeHeader(header)) ?? -1;

  const missing = REQUIRED_HEADERS.filter((h) => indexOf(h) < 0);
  if (missing.length > 0) {
    console.warn(
      `preprocess: required CSV columns not found — update COLUMNS in src/lib/preprocess.ts: ${missing
        .map((h) => `"${h}"`)
        .join(", ")}`,
    );
  }

  const perDistrict = new Map<number, number>();
  const candidates: Candidate[] = [];

  for (const cols of rows.slice(1)) {
    const draft: RowDraft = {};
    for (const col of COLUMNS) {
      const i = indexOf(col.header);
      if (i >= 0) col.apply(draft, cols[i] ?? "");
    }

    if (draft.districtId == null || Number.isNaN(draft.districtId)) continue;
    if (!draft.surname && !draft.firstName) continue;

    const n = (perDistrict.get(draft.districtId) ?? 0) + 1;
    perDistrict.set(draft.districtId, n);

    const name = [draft.surname, draft.firstName, draft.titles].filter(Boolean).join(" ");

    const c: Candidate = {
      id: `${draft.districtId}-${n}`,
      districtId: draft.districtId,
      candidateNumber: n,
      name,
      electoralParty: draft.electoralParty ?? "",
      occupation: draft.occupation ?? "",
      gender: guessGender(name),
      supported: draft.supported ?? false,
    };
    if (draft.birthYear) c.birthYear = draft.birthYear;
    if (draft.coalition) c.coalition = draft.coalition;
    if (draft.signedDeclaration) c.signedDeclaration = true;
    if (draft.hlidacStatuUrl) c.hlidacStatuUrl = draft.hlidacStatuUrl;
    if (draft.facebook) c.facebook = draft.facebook;
    if (draft.instagram) c.instagram = draft.instagram;
    if (draft.web) c.web = draft.web;

    candidates.push(c);
  }

  return candidates;
}

/**
 * Build stage 2 — preprocess the CSV into the single JSON data file that the
 * Astro build reads. Returns the number of candidates written.
 */
export function preprocessCsvFile(
  csvPath: string = DEFAULT_CSV_SRC,
  outPath: string = DEFAULT_JSON_DEST,
): number {
  const csv = readFileSync(resolve(csvPath), "utf-8");
  const candidates = parseCandidatesCsv(csv);

  const abs = resolve(outPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(candidates, null, 2) + "\n", "utf-8");

  return candidates.length;
}
