#!/usr/bin/env node
/**
 * Converts data-raw/vsichni-platni-kandidati.csv into:
 *   data/candidates.json          — structured candidate data
 *   data/profiles/{obvod}/{č}.md  — markdown profile stub per candidate
 *
 * Run: node scripts/convert-csv.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(import.meta.url), '../../');
const csvPath = path.join(root, 'data-raw/vsichni-platni-kandidati.csv');
const outJson = path.join(root, 'data/candidates.json');
const profilesDir = path.join(root, 'data/profiles');

function clean(s) {
  return s.replace(/^﻿/, '').replace(/​/g, '').trim();
}

function parseFloatCs(s) {
  return parseFloat(s.trim().replace(',', '.')) || 0;
}

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

// Write candidates.json
fs.writeFileSync(outJson, JSON.stringify(candidates, null, 2) + '\n');
console.log(`Wrote ${candidates.length} candidates → data/candidates.json`);

// Write markdown profile stubs (skip if file already exists to preserve edits)
let created = 0;
let skipped = 0;
for (const c of candidates) {
  const dir = path.join(profilesDir, String(c.districtId));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${c.candidateNumber}.md`);
  if (fs.existsSync(file)) {
    skipped++;
    continue;
  }
  const content = `# ${c.name}

## Motivace ke kandidatuře

<!-- Doplňte odpověď kandidáta -->

## Kde vidíte republiku za 6 let?

<!-- Doplňte odpověď kandidáta -->

## Zapojení do kampaně

<!-- Kontaktní informace a možnosti zapojení -->
`;
  fs.writeFileSync(file, content);
  created++;
}
console.log(`Profiles: ${created} created, ${skipped} skipped (already exist)`);
