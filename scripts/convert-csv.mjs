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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(import.meta.url), '../../');
const csvPath = path.join(root, 'data-raw/vsichni-platni-kandidati.csv');
const profilesDir = path.join(root, 'data/profiles');

function clean(s) {
  return s.replace(/^﻿/, '').replace(/​/g, '').trim();
}

function parseFloatCs(s) {
  return parseFloat(s.trim().replace(',', '.')) || 0;
}

// Escape a string value for YAML (quote if it contains special chars)
function yamlStr(s) {
  if (/[:#\[\]{},&*!|>'"%@`\n]/.test(s) || s.trim() !== s || s === '') {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

function toFrontmatter(c) {
  return [
    '---',
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
    '---',
  ].join('\n');
}

// Extract the markdown body (everything after the closing ---), or return default stub
function extractBody(existingContent) {
  const match = existingContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (match) return match[1];
  // No existing frontmatter — treat the whole file as the body
  return existingContent;
}

const defaultBody = (name) => `
# ${name}

## Motivace ke kandidatuře

<!-- Doplňte odpověď kandidáta -->

## Kde vidíte republiku za 6 let?

<!-- Doplňte odpověď kandidáta -->

## Zapojení do kampaně

<!-- Kontaktní informace a možnosti zapojení -->
`;

const raw = fs.readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter(l => l.trim());

const candidates = lines.slice(1).map(line => {
  const cols = line.split(';').map(clean);
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
  const dir = path.join(profilesDir, String(c.districtId));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${c.candidateNumber}.md`);

  let body;
  if (fs.existsSync(file)) {
    body = extractBody(fs.readFileSync(file, 'utf-8'));
    updated++;
  } else {
    body = defaultBody(c.name);
    created++;
  }

  fs.writeFileSync(file, toFrontmatter(c) + '\n' + body);
}
console.log(`Profiles: ${created} created, ${updated} updated with frontmatter (${candidates.length} total).`);
