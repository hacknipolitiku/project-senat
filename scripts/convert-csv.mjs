#!/usr/bin/env node
/**
 * Converts data-raw/vsichni-platni-kandidati.csv into:
 *   data/profiles/{obvod}/{č}.md  — markdown profile with YAML frontmatter
 *
 * Frontmatter fields are always updated from the CSV.
 * The markdown body is preserved when the file already exists.
 *
 * Run: node scripts/convert-csv.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../../");
const csvPath = path.join(root, "data-raw/vsichni-platni-kandidati.csv");
const profilesDir = path.join(root, "data/profiles");

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[áä]/g, "a")
    .replace(/č/g, "c")
    .replace(/ď/g, "d")
    .replace(/[éě]/g, "e")
    .replace(/í/g, "i")
    .replace(/ň/g, "n")
    .replace(/[óö]/g, "o")
    .replace(/ř/g, "r")
    .replace(/š/g, "s")
    .replace(/ť/g, "t")
    .replace(/[úůü]/g, "u")
    .replace(/ý/g, "y")
    .replace(/ž/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function candidateSlug(rawName, districtId, candidateNumber) {
  const tokens = rawName.trim().split(/\s+/).map((t) => t.replace(/,+$/, ""));
  const nameParts = tokens.filter((t) => !TITLES.has(t));
  if (nameParts.length < 2) {
    return `${slugify(rawName)}-${districtId}-${candidateNumber}`;
  }
  const surname = nameParts[0];
  const firstName = nameParts[nameParts.length - 1];
  return `${slugify(surname)}-${slugify(firstName)}-${districtId}-${candidateNumber}`;
}

function clean(s) {
  return s.replace(/^﻿/, "").replace(/​/g, "").trim();
}

function parseFloatCs(s) {
  return parseFloat(s.trim().replace(",", ".")) || 0;
}

// Escape a string value for YAML (quote if it contains special chars)
function yamlStr(s) {
  if (/[:#\[\]{},&*!|>'"%@`\n]/.test(s) || s.trim() !== s || s === "") {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

function toFrontmatter(c) {
  return [
    "---",
    `districtId: ${c.districtId}`,
    `candidateNumber: ${c.candidateNumber}`,
    `name: ${yamlStr(c.name)}`,
    `age: ${c.age}`,
    `electoralParty: ${yamlStr(c.electoralParty)}`,
    `nominatingParty: ${yamlStr(c.nominatingParty)}`,
    `politicalAffiliation: ${yamlStr(c.politicalAffiliation)}`,
    `occupation: ${yamlStr(c.occupation)}`,
    `residence: ${yamlStr(c.residence)}`,
    `round1Votes: ${c.round1Votes}`,
    `round1Percent: ${c.round1Percent}`,
    `round2Votes: ${c.round2Votes}`,
    `round2Percent: ${c.round2Percent}`,
    "---",
  ].join("\n");
}

// Extract the markdown body (everything after the closing ---), or return default stub
function extractBody(existingContent) {
  const match = existingContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (match) return match[1];
  // No existing frontmatter — treat the whole file as the body
  return existingContent;
}

const TITLES = new Set([
  "Bc.",
  "Ing.",
  "Mgr.",
  "MgA.",
  "MUDr.",
  "MDDr.",
  "MVDr.",
  "JUDr.",
  "PhDr.",
  "RNDr.",
  "PharmDr.",
  "ThDr.",
  "PaedDr.",
  "RSDr.",
  "Dr.",
  "doc.",
  "Doc.",
  "prof.",
  "Prof.",
  "Ph.D.",
  "PhD.",
  "CSc.",
  "DrSc.",
  "DSc.",
  "DiS.",
  "MBA",
  "LL.M.",
  "MSc.",
  "DBA",
  "MPA",
  "gen.",
  "plk.",
  "brig.",
  "et.",
  "et",
  "v.",
  "záloze",
  "h.",
  "c.",
]);

function nameToEmail(raw) {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/,+$/, ""));
  const nameParts = tokens.filter((t) => !TITLES.has(t));
  if (nameParts.length < 2) return null;
  const firstName = nameParts[nameParts.length - 1];
  const surname = nameParts[0];
  const slug = [firstName, surname]
    .map((s) =>
      s
        .toLowerCase()
        .replace(/[áä]/g, "a")
        .replace(/č/g, "c")
        .replace(/ď/g, "d")
        .replace(/[éě]/g, "e")
        .replace(/í/g, "i")
        .replace(/ň/g, "n")
        .replace(/[óö]/g, "o")
        .replace(/ř/g, "r")
        .replace(/š/g, "s")
        .replace(/ť/g, "t")
        .replace(/[úůü]/g, "u")
        .replace(/ý/g, "y")
        .replace(/ž/g, "z")
        .replace(/[^a-z0-9]/g, ""),
    )
    .join("-");
  return `${slug}@pomoztemidosenatu.cz`;
}

const isPlaceholderBody = (body) => body.includes("Doplňte odpověď kandidáta");

const defaultBody = (name) => {
  const email = nameToEmail(name);
  return `\n${email ? email : ""}\n`;
};

const raw = fs.readFileSync(csvPath, "utf-8");
const lines = raw.split("\n").filter((l) => l.trim());

const candidates = lines.slice(1).map((line) => {
  const cols = line.split(";").map(clean);
  return {
    districtId: parseInt(cols[0]),
    candidateNumber: parseInt(cols[1]),
    name: cols[2],
    age: parseInt(cols[3]) || 0,
    electoralParty: cols[4],
    nominatingParty: cols[5],
    politicalAffiliation: cols[6],
    occupation: cols[7],
    residence: cols[8],
    round1Votes: parseInt(cols[9]) || 0,
    round1Percent: parseFloatCs(cols[10]),
    round2Votes: parseInt(cols[11]) || 0,
    round2Percent: parseFloatCs(cols[12]),
  };
});

let created = 0;
let updated = 0;
for (const c of candidates) {
  const slug = candidateSlug(c.name, c.districtId, c.candidateNumber);
  const file = path.join(profilesDir, `${slug}.md`);
  const oldFile = path.join(profilesDir, String(c.districtId), `${c.candidateNumber}.md`);

  let body;
  if (fs.existsSync(file)) {
    const existing = extractBody(fs.readFileSync(file, "utf-8"));
    body = isPlaceholderBody(existing) ? defaultBody(c.name) : existing;
    updated++;
  } else if (fs.existsSync(oldFile)) {
    // Migrate body from old subdirectory layout
    const existing = extractBody(fs.readFileSync(oldFile, "utf-8"));
    body = isPlaceholderBody(existing) ? defaultBody(c.name) : existing;
    created++;
  } else {
    body = defaultBody(c.name);
    created++;
  }

  fs.writeFileSync(file, toFrontmatter(c) + "\n" + body);
}
console.log(
  `Profiles: ${created} created, ${updated} updated with frontmatter (${candidates.length} total).`,
);
