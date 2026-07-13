import matter from "gray-matter";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const candidatesDir = path.resolve(
  fileURLToPath(import.meta.url),
  "../../../data/candidates",
);

const TITLES = new Set([
  "Bc.", "Ing.", "Mgr.", "MgA.", "MUDr.", "MDDr.", "MVDr.", "JUDr.",
  "PhDr.", "RNDr.", "PharmDr.", "ThDr.", "PaedDr.", "RSDr.", "Dr.",
  "doc.", "Doc.", "prof.", "Prof.", "Ph.D.", "PhD.", "CSc.", "DrSc.",
  "DSc.", "DiS.", "MBA", "LL.M.", "MSc.", "DBA", "MPA",
  "gen.", "plk.", "brig.", "et.", "et", "v.", "záloze", "h.", "c.",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[áä]/g, "a").replace(/č/g, "c").replace(/ď/g, "d")
    .replace(/[éě]/g, "e").replace(/í/g, "i").replace(/ň/g, "n")
    .replace(/[óö]/g, "o").replace(/ř/g, "r").replace(/š/g, "s")
    .replace(/ť/g, "t").replace(/[úůü]/g, "u").replace(/ý/g, "y")
    .replace(/ž/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function candidateSlug(rawName: string, districtId: number, candidateNumber: number): string {
  const tokens = rawName.trim().split(/\s+/).map((t) => t.replace(/,+$/, ""));
  const nameParts = tokens.filter((t) => !TITLES.has(t));
  if (nameParts.length < 2) return `${slugify(rawName)}-${districtId}-${candidateNumber}`;
  const surname = nameParts[0];
  const firstName = nameParts[nameParts.length - 1];
  return `${slugify(surname)}-${slugify(firstName)}-${districtId}-${candidateNumber}`;
}

function clean(s: string): string {
  return s.replace(/^﻿/, "").replace(/​/g, "").trim();
}

function parseFloatCs(s: string): number {
  return parseFloat(s.trim().replace(",", ".")) || 0;
}

function yamlStr(s: string): string {
  if (/[:#\[\]{},&*!|>'"%@`\n]/.test(s) || s.trim() !== s || s === "")
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return s;
}

interface Candidate {
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
  hlidacStatuOsobaId?: string;
}

function toFrontmatter(c: Candidate): string {
  const lines = [
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
  ];
  if (c.round1Votes !== undefined) lines.push(`round1Votes: ${c.round1Votes}`);
  if (c.round1Percent !== undefined) lines.push(`round1Percent: ${c.round1Percent}`);
  if (c.round2Votes !== undefined) lines.push(`round2Votes: ${c.round2Votes}`);
  if (c.round2Percent !== undefined) lines.push(`round2Percent: ${c.round2Percent}`);
  if (c.hlidacStatuOsobaId) lines.push(`hlidacStatuOsobaId: ${yamlStr(c.hlidacStatuOsobaId)}`);
  lines.push("---");
  return lines.join("\n");
}

function defaultBody(name: string): string {
  return `\n${slugify(name)}@pomoztemidosenatu.cz\n`;
}

export function importCsv(csvArg: string): void {
  const lines = fs
    .readFileSync(path.resolve(csvArg), "utf-8")
    .split("\n")
    .filter((l) => l.trim());

  const candidates: Candidate[] = lines.slice(1).map((line) => {
    const cols = line.split(";").map(clean);
    const c: Candidate = {
      districtId: parseInt(cols[0]),
      candidateNumber: parseInt(cols[1]),
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

  let created = 0;
  let updated = 0;
  for (const c of candidates) {
    const slug = candidateSlug(c.name, c.districtId, c.candidateNumber);
    const filePath = path.join(candidatesDir, `${slug}.md`);
    const exists = fs.existsSync(filePath);
    if (exists) {
      const parsed = matter(fs.readFileSync(filePath, "utf-8"));
      c.hlidacStatuOsobaId = parsed.data.hlidacStatuOsobaId ?? undefined;
      fs.writeFileSync(filePath, toFrontmatter(c) + "\n" + parsed.content);
    } else {
      fs.writeFileSync(filePath, toFrontmatter(c) + "\n" + defaultBody(c.name));
    }
    if (exists) updated++;
    else created++;
  }
  console.log(`Done: ${created} created, ${updated} updated (${candidates.length} total).`);
}
