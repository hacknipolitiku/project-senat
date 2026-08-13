import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Where the download step leaves the CSV, and the preprocess step reads it. */
export const DEFAULT_CSV_SRC = "data-raw/vsichni-platni-kandidati.csv";
/** The single data file the Astro build consumes. */
export const DEFAULT_JSON_DEST = "data/candidates.json";

export interface Candidate {
  /** Collection entry id: `${districtId}-${candidateNumber}`. */
  id: string;
  districtId: number;
  candidateNumber: number;
  name: string;
  age: number;
  electoralParty: string;
  nominatingParty: string;
  politicalAffiliation: string;
  occupation: string;
  residence: string;
  /** Guessed from the name: "m" male, "f" female (drives Czech word endings). */
  gender: "m" | "f";
  round1Votes?: number;
  round1Percent?: number;
  round2Votes?: number;
  round2Percent?: number;
  signedDeclaration?: boolean;
  hlidacStatuUrl?: string;
  twitter?: string;
  instagram?: string;
  showForm?: boolean;
}

/**
 * Maps each Candidate field to the CSV column header it is read from.
 *
 * Columns are matched by header name (case-insensitive, whitespace-collapsed),
 * NOT by position — so reordered columns still import correctly. When the real
 * CSV uses different header text, update the strings here and nothing else.
 * A field whose header is not found is simply left empty/omitted; the new
 * declaration/social/form columns below use best-guess headers — adjust them
 * once the real export is available.
 */
const COLUMNS = {
  districtId: "Volební obvod",
  candidateNumber: "Kandidát.číslo",
  name: "Kandidát.příjmení, jméno, tituly",
  age: "Kandidát.věk",
  electoralParty: "Volební strana",
  nominatingParty: "Navrhující strana",
  politicalAffiliation: "Politická příslušnost",
  occupation: "Povolání",
  residence: "Bydliště",
  round1Votes: "1. kolo.počet hlasů",
  round1Percent: "1. kolo.%",
  round2Votes: "2. kolo.počet hlasů",
  round2Percent: "2. kolo.%",
  signedDeclaration: "Podepsal deklaraci",
  hlidacStatuUrl: "Hlídač státu URL",
  twitter: "Twitter",
  instagram: "Instagram",
  showForm: "Zobrazit formulář",
} as const;

type Field = keyof typeof COLUMNS;

/** Base columns without which a row cannot be identified. */
const REQUIRED_FIELDS: Field[] = ["districtId", "candidateNumber", "name"];

/** Strip BOM, zero-width spaces and surrounding whitespace from a CSV cell. */
function clean(s: string): string {
  return (s ?? "").replace(/^﻿/, "").replace(/​/g, "").trim();
}

/** Normalize a header for tolerant matching. */
function normalizeHeader(s: string): string {
  return clean(s).toLowerCase().replace(/\s+/g, " ");
}

/** Parse a Czech-locale float ("5,64" → 5.64). */
function parseFloatCs(s: string): number {
  return parseFloat(s.trim().replace(",", ".")) || 0;
}

const TRUTHY = new Set(["ano", "true", "1", "x", "yes", "y", "✓", "ok"]);

/** Interpret a cell as a boolean flag (Czech "Ano", "true", "1", "x", …). */
function parseBool(s: string): boolean {
  return TRUTHY.has(clean(s).toLowerCase());
}

/** Reduce "@handle", "handle" or a full profile URL to a bare handle. */
function stripHandle(s: string): string {
  const v = clean(s).replace(/\/+$/, "");
  const fromUrl = v.match(/(?:x\.com|twitter\.com|instagram\.com)\/(?:#!\/)?@?([^/?#]+)/i);
  return (fromUrl ? fromUrl[1] : v).replace(/^@/, "");
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
 * Parse the semicolon-separated candidates CSV (with a header row) into
 * Candidate objects. Pure function — no filesystem access, so it can be
 * unit-tested against an inline sample.
 */
export function parseCandidatesCsv(csv: string): Candidate[] {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(";").map(normalizeHeader);
  const colIndex = Object.fromEntries(
    (Object.entries(COLUMNS) as [Field, string][]).map(([field, header]) => [
      field,
      headers.indexOf(normalizeHeader(header)),
    ]),
  ) as Record<Field, number>;

  const missingRequired = REQUIRED_FIELDS.filter((f) => colIndex[f] < 0);
  if (missingRequired.length > 0) {
    console.warn(
      `preprocess: required CSV columns not found — update COLUMNS in src/lib/preprocess.ts: ${missingRequired
        .map((f) => `${f} ("${COLUMNS[f]}")`)
        .join(", ")}`,
    );
  }

  const cell = (cols: string[], field: Field): string => {
    const i = colIndex[field];
    return i >= 0 ? clean(cols[i] ?? "") : "";
  };

  return lines.slice(1).map((line) => {
    const cols = line.split(";");
    const districtId = parseInt(cell(cols, "districtId"));
    const candidateNumber = parseInt(cell(cols, "candidateNumber"));
    const name = cell(cols, "name");

    const c: Candidate = {
      id: `${districtId}-${candidateNumber}`,
      districtId,
      candidateNumber,
      name,
      age: parseInt(cell(cols, "age")) || 0,
      electoralParty: cell(cols, "electoralParty"),
      nominatingParty: cell(cols, "nominatingParty"),
      politicalAffiliation: cell(cols, "politicalAffiliation"),
      occupation: cell(cols, "occupation"),
      residence: cell(cols, "residence"),
      gender: guessGender(name),
    };

    const r1v = cell(cols, "round1Votes");
    const r1p = cell(cols, "round1Percent");
    const r2v = cell(cols, "round2Votes");
    const r2p = cell(cols, "round2Percent");
    if (r1v) c.round1Votes = parseInt(r1v) || 0;
    if (r1p) c.round1Percent = parseFloatCs(r1p);
    if (r2v) c.round2Votes = parseInt(r2v) || 0;
    if (r2p) c.round2Percent = parseFloatCs(r2p);

    if (parseBool(cell(cols, "signedDeclaration"))) c.signedDeclaration = true;
    const hlidac = cell(cols, "hlidacStatuUrl");
    if (hlidac) c.hlidacStatuUrl = hlidac;
    const twitter = stripHandle(cell(cols, "twitter"));
    if (twitter) c.twitter = twitter;
    const instagram = stripHandle(cell(cols, "instagram"));
    if (instagram) c.instagram = instagram;
    if (parseBool(cell(cols, "showForm"))) c.showForm = true;

    return c;
  });
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
