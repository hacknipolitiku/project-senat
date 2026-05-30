import fs from 'node:fs';
import path from 'node:path';

export interface Candidate {
  districtId: number;
  candidateNumber: number;
  name: string;
  age: number;
  electoralParty: string;
  nominatingParty: string;
  politicalAffiliation: string;
  occupation: string;
  residence: string;
  round1Votes: number;
  round1Percent: number;
  round2Votes: number;
  round2Percent: number;
}

export interface District {
  id: number;
  name: string;
  candidates: Candidate[];
}

export const DISTRICTS: Record<number, string> = {
  3: 'Cheb',
  6: 'Louny',
  9: 'Plzeň-město',
  12: 'Strakonice',
  15: 'Pelhřimov',
  18: 'Příbram',
  21: 'Praha 5',
  24: 'Praha 9',
  27: 'Praha 1',
  30: 'Kladno',
  33: 'Děčín',
  36: 'Česká Lípa',
  39: 'Trutnov',
  42: 'Kolín',
  45: 'Hradec Králové',
  48: 'Rychnov nad Kněžnou',
  51: 'Žďár nad Sázavou',
  54: 'Znojmo',
  57: 'Vyškov',
  60: 'Brno-město',
  63: 'Přerov',
  66: 'Olomouc',
  69: 'Frýdek-Místek',
  72: 'Ostrava-město',
  75: 'Karviná',
  78: 'Zlín',
  81: 'Uherské Hradiště',
};

function parseFloat_cs(s: string): number {
  return parseFloat(s.trim().replace(',', '.')) || 0;
}

function clean(s: string): string {
  // Remove BOM, zero-width spaces, and trim
  return s.replace(/^﻿/, '').replace(/​/g, '').trim();
}

let _candidates: Candidate[] | null = null;

export function getCandidates(): Candidate[] {
  if (_candidates) return _candidates;

  const csvPath = path.resolve(process.cwd(), 'data-raw/vsichni-platni-kandidati.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());

  _candidates = lines.slice(1).map((line) => {
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
      round1Percent: parseFloat_cs(cols[10]),
      round2Votes: parseInt(cols[11]) || 0,
      round2Percent: parseFloat_cs(cols[12]),
    };
  });

  return _candidates;
}

export function getDistricts(): District[] {
  const candidates = getCandidates();
  return Object.entries(DISTRICTS).map(([idStr, name]) => {
    const id = parseInt(idStr);
    return {
      id,
      name,
      candidates: candidates.filter((c) => c.districtId === id),
    };
  });
}

export function getDistrict(id: number): District | undefined {
  const candidates = getCandidates();
  const name = DISTRICTS[id];
  if (!name) return undefined;
  return { id, name, candidates: candidates.filter((c) => c.districtId === id) };
}

export function getCandidate(districtId: number, candidateNumber: number): Candidate | undefined {
  return getCandidates().find(
    (c) => c.districtId === districtId && c.candidateNumber === candidateNumber
  );
}

export function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[áàâä]/g, 'a')
    .replace(/[čć]/g, 'c')
    .replace(/[ďd]/g, 'd')
    .replace(/[éěêë]/g, 'e')
    .replace(/[íîï]/g, 'i')
    .replace(/[ňn]/g, 'n')
    .replace(/[óôö]/g, 'o')
    .replace(/[řr]/g, 'r')
    .replace(/[šs]/g, 's')
    .replace(/[ťt]/g, 't')
    .replace(/[úůûü]/g, 'u')
    .replace(/[ýy]/g, 'y')
    .replace(/[žz]/g, 'z')
    .replace(/[^a-z0-9-]/g, '');
}

// Approximate SVG coordinates for each district center (viewBox 0 0 800 450)
export const DISTRICT_COORDS: Record<number, { x: number; y: number }> = {
  3:  { x: 87,  y: 195 }, // Cheb
  6:  { x: 220, y: 155 }, // Louny
  9:  { x: 175, y: 248 }, // Plzeň
  12: { x: 225, y: 340 }, // Strakonice
  15: { x: 348, y: 325 }, // Pelhřimov
  18: { x: 245, y: 265 }, // Příbram
  21: { x: 291, y: 202 }, // Praha 5
  24: { x: 305, y: 192 }, // Praha 9
  27: { x: 298, y: 198 }, // Praha 1
  30: { x: 257, y: 186 }, // Kladno
  33: { x: 262, y: 100 }, // Děčín
  36: { x: 300, y: 112 }, // Česká Lípa
  39: { x: 425, y: 100 }, // Trutnov
  42: { x: 350, y: 210 }, // Kolín
  45: { x: 420, y: 172 }, // Hradec Králové
  48: { x: 463, y: 183 }, // Rychnov
  51: { x: 428, y: 297 }, // Žďár
  54: { x: 440, y: 392 }, // Znojmo
  57: { x: 540, y: 340 }, // Vyškov
  60: { x: 498, y: 355 }, // Brno
  63: { x: 583, y: 313 }, // Přerov
  66: { x: 562, y: 298 }, // Olomouc
  69: { x: 655, y: 285 }, // Frýdek-Místek
  72: { x: 652, y: 265 }, // Ostrava
  75: { x: 677, y: 258 }, // Karviná
  78: { x: 602, y: 348 }, // Zlín
  81: { x: 575, y: 368 }, // Uherské Hradiště
};
