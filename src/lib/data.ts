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
  hlidacStatuUrl?: string;
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

let _candidates: Candidate[] | null = null;

export function getCandidates(): Candidate[] {
  if (_candidates) return _candidates;
  const jsonPath = path.resolve(process.cwd(), 'data/candidates.json');
  _candidates = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Candidate[];
  return _candidates;
}

export function getDistricts(): District[] {
  const candidates = getCandidates();
  return Object.entries(DISTRICTS).map(([idStr, name]) => {
    const id = parseInt(idStr);
    return { id, name, candidates: candidates.filter((c) => c.districtId === id) };
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

export interface ProfileSection {
  heading: string;
  body: string;
}

export function getCandidateProfileSections(districtId: number, candidateNumber: number): ProfileSection[] {
  const profilePath = path.resolve(
    process.cwd(),
    `data/profiles/${districtId}/${candidateNumber}.md`
  );
  if (!fs.existsSync(profilePath)) return [];
  const md = fs.readFileSync(profilePath, 'utf-8');

  const sections: ProfileSection[] = [];
  // Split on ## headings (skip leading # h1 title line if present)
  const parts = md.split(/^## /m);
  for (const part of parts.slice(1)) {
    const newline = part.indexOf('\n');
    const heading = newline === -1 ? part.trim() : part.slice(0, newline).trim();
    const body = newline === -1 ? '' : part.slice(newline + 1).trim();
    sections.push({ heading, body });
  }
  return sections;
}

// Approximate SVG coordinates for each district center (viewBox 0 0 800 450)
export const DISTRICT_COORDS: Record<number, { x: number; y: number }> = {
  3:  { x: 87,  y: 195 },
  6:  { x: 220, y: 155 },
  9:  { x: 175, y: 248 },
  12: { x: 225, y: 340 },
  15: { x: 348, y: 325 },
  18: { x: 245, y: 265 },
  21: { x: 291, y: 202 },
  24: { x: 305, y: 192 },
  27: { x: 298, y: 198 },
  30: { x: 257, y: 186 },
  33: { x: 262, y: 100 },
  36: { x: 300, y: 112 },
  39: { x: 425, y: 100 },
  42: { x: 350, y: 210 },
  45: { x: 420, y: 172 },
  48: { x: 463, y: 183 },
  51: { x: 428, y: 297 },
  54: { x: 440, y: 392 },
  57: { x: 540, y: 340 },
  60: { x: 498, y: 355 },
  63: { x: 583, y: 313 },
  66: { x: 562, y: 298 },
  69: { x: 655, y: 285 },
  72: { x: 652, y: 265 },
  75: { x: 677, y: 258 },
  78: { x: 602, y: 348 },
  81: { x: 575, y: 368 },
};
