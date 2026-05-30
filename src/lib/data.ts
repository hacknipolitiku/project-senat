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

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    result[key] = value;
  }
  return result;
}

let _candidates: Candidate[] | null = null;

export function getCandidates(): Candidate[] {
  if (_candidates) return _candidates;
  const profilesDir = path.resolve(process.cwd(), 'data/profiles');
  const candidates: Candidate[] = [];
  for (const districtDir of fs.readdirSync(profilesDir)) {
    const districtPath = path.join(profilesDir, districtDir);
    if (!fs.statSync(districtPath).isDirectory()) continue;
    for (const file of fs.readdirSync(districtPath)) {
      if (!file.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(districtPath, file), 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm.districtId) continue;
      candidates.push({
        districtId: parseInt(fm.districtId),
        candidateNumber: parseInt(fm.candidateNumber),
        name: fm.name ?? '',
        age: parseInt(fm.age) || 0,
        electoralParty: fm.electoralParty ?? '',
        nominatingParty: fm.nominatingParty ?? '',
        politicalAffiliation: fm.politicalAffiliation ?? '',
        occupation: fm.occupation ?? '',
        residence: fm.residence ?? '',
        round1Votes: parseInt(fm.round1Votes) || 0,
        round1Percent: parseFloat(fm.round1Percent) || 0,
        round2Votes: parseInt(fm.round2Votes) || 0,
        round2Percent: parseFloat(fm.round2Percent) || 0,
        ...(fm.hlidacStatuUrl ? { hlidacStatuUrl: fm.hlidacStatuUrl } : {}),
      });
    }
  }
  candidates.sort((a, b) => a.districtId - b.districtId || a.candidateNumber - b.candidateNumber);
  _candidates = candidates;
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

// Maps a canonical party key to its logo filename in /public/logos/
const PARTY_LOGOS: Record<string, string> = {
  'ANO':       'ano.svg',
  'ODS':       'ods.svg',
  'KDU-ČSL':  'kdu-csl.svg',
  'KDU':       'kdu-csl.svg',
  'STAN':      'stan.svg',
  'Piráti':    'pirati.svg',
  'TOP 09':    'top09.svg',
  'TOP09':     'top09.svg',
  'TOP':       'top09.svg',
  'SOCDEM':    'socdem.svg',
  'ČSSD':      'socdem.svg',
  'KSČM':      'kscm.svg',
  'SPD':       'spd.svg',
  'Zelení':    'zeleni.svg',
  'Zel':       'zeleni.svg',
  'SEN 21':    'sen21.svg',
  'SEN21':     'sen21.svg',
  'Trikolora': 'trikolora.svg',
  'Svobodní':  'svobodni.svg',
};

/**
 * Returns an array of logo filenames (from /public/logos/) for the given
 * electoral party string. Handles coalitions by splitting on '+' and '·'.
 */
export function getPartyLogoFiles(electoralParty: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const parts = electoralParty.split(/[+·]/).map((p) => p.trim());
  for (const part of parts) {
    // Try progressively shorter prefixes to catch things like "KDU-ČSL+NMFM"
    let matched = false;
    for (const [key, file] of Object.entries(PARTY_LOGOS)) {
      if (part === key || part.startsWith(key)) {
        if (!seen.has(file)) { seen.add(file); result.push(file); }
        matched = true;
        break;
      }
    }
    // Also try if a known key appears anywhere in the part
    if (!matched) {
      for (const [key, file] of Object.entries(PARTY_LOGOS)) {
        if (part.includes(key)) {
          if (!seen.has(file)) { seen.add(file); result.push(file); }
          break;
        }
      }
    }
  }
  return result;
}

// Titles that precede the name in Czech convention
const PRE_NAME_TITLES = new Set([
  'Bc.', 'Ing.', 'Mgr.', 'MgA.', 'MUDr.', 'MDDr.', 'MVDr.',
  'JUDr.', 'PhDr.', 'RNDr.', 'PharmDr.', 'ThDr.', 'PaedDr.',
  'RSDr.', 'Dr.', 'Dr.-', 'doc.', 'Doc.', 'prof.', 'Prof.',
  'gen.', 'plk.', 'brig.', 'gšt.', 'generálmajor',
]);

// Titles that follow the name (after a comma) in Czech convention
const POST_NAME_TITLES = new Set([
  'Ph.D.', 'PhD.', 'CSc.', 'DrSc.', 'DSc.', 'DiS.',
  'MBA', 'LL.M.', 'MSc.', 'DBA', 'MPA', 'dr.',
]);

// All recognised title tokens (used to find where the name ends)
const ALL_TITLES = new Set([...PRE_NAME_TITLES, ...POST_NAME_TITLES,
  'et.', 'et', 'v.', 'v', 'záloze', 'h.', 'c.', 'dr.',
]);

/**
 * Reformat a raw candidate name from the source data format
 * "Surname [Surname2] Firstname [Titles…]" into Czech display convention
 * "[pre-titles] Firstname Surname[, post-titles]"
 */
export function formatCzechName(raw: string): string {
  // Normalise: strip trailing commas from tokens, collapse spaces
  const tokens = raw.trim().split(/\s+/).map((t) => t.replace(/,+$/, ''));

  // Find the index of the first title token
  let titleStart = tokens.length;
  for (let i = 0; i < tokens.length; i++) {
    if (ALL_TITLES.has(tokens[i])) {
      titleStart = i;
      break;
    }
  }

  const nameParts = tokens.slice(0, titleStart);
  const titleParts = tokens.slice(titleStart);

  if (nameParts.length === 0) return raw;

  // Last name token is the first name; everything before is surname(s)
  const firstName = nameParts[nameParts.length - 1];
  const surnames = nameParts.slice(0, -1);

  // Classify title tokens into pre-name and post-name groups.
  // Post-name titles are comma-separated; connectors/modifiers are space-joined
  // onto the preceding token so compound forms like "dr. h. c." stay intact.
  const preTitles: string[] = [];
  const postGroups: string[] = []; // each entry becomes one comma-separated item
  let inPost = false;

  for (const t of titleParts) {
    if (POST_NAME_TITLES.has(t)) {
      inPost = true;
      postGroups.push(t);
    } else if (PRE_NAME_TITLES.has(t)) {
      if (inPost) postGroups.push(t);
      else preTitles.push(t);
    } else {
      // connector / modifier (et, v., záloze, h., c., dr.) — space-join onto last entry
      if (inPost) {
        if (postGroups.length > 0) postGroups[postGroups.length - 1] += ' ' + t;
        else postGroups.push(t);
      } else {
        preTitles.push(t);
      }
    }
  }

  let result = '';
  if (preTitles.length > 0) result += preTitles.join(' ') + ' ';
  result += firstName;
  if (surnames.length > 0) result += ' ' + surnames.join(' ');
  if (postGroups.length > 0) result += ', ' + postGroups.join(', ');

  return result;
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
  // Strip frontmatter before parsing sections
  const body = md.replace(/^---\n[\s\S]*?\n---\n?/, '');
  // Split on ## headings (skip leading # h1 title line if present)
  const parts = body.split(/^## /m);
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
