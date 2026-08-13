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
  round1Votes?: number;
  round1Percent?: number;
  round2Votes?: number;
  round2Percent?: number;
}

/** Strip BOM, zero-width spaces and surrounding whitespace from a CSV cell. */
function clean(s: string): string {
  return (s ?? "").replace(/^﻿/, "").replace(/​/g, "").trim();
}

/** Parse a Czech-locale float ("5,64" → 5.64). */
function parseFloatCs(s: string): number {
  return parseFloat(s.trim().replace(",", ".")) || 0;
}

/**
 * Parse the semicolon-separated candidates CSV (with a header row) into
 * Candidate objects. Pure function — no filesystem access, so it can be
 * unit-tested against an inline sample.
 */
export function parseCandidatesCsv(csv: string): Candidate[] {
  const lines = csv.split("\n").filter((l) => l.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(";").map(clean);
    const districtId = parseInt(cols[0]);
    const candidateNumber = parseInt(cols[1]);

    const c: Candidate = {
      id: `${districtId}-${candidateNumber}`,
      districtId,
      candidateNumber,
      name: cols[2],
      age: parseInt(cols[3]) || 0,
      electoralParty: cols[4],
      nominatingParty: cols[5],
      politicalAffiliation: cols[6],
      occupation: cols[7],
      residence: cols[8],
    };

    if (cols[9]?.trim()) c.round1Votes = parseInt(cols[9]) || 0;
    if (cols[10]?.trim()) c.round1Percent = parseFloatCs(cols[10]);
    if (cols[11]?.trim()) c.round2Votes = parseInt(cols[11]) || 0;
    if (cols[12]?.trim()) c.round2Percent = parseFloatCs(cols[12]);

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
