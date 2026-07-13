
function slugify(s: string): string {
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

export function districtSlug(name: string): string {
  return slugify(name);
}

const PRE_NAME_TITLES = new Set([
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
  "Dr.-",
  "doc.",
  "Doc.",
  "prof.",
  "Prof.",
  "gen.",
  "plk.",
  "brig.",
  "gšt.",
  "generálmajor",
]);

const POST_NAME_TITLES = new Set([
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
  "dr.",
]);

const ALL_TITLES = new Set([
  ...PRE_NAME_TITLES,
  ...POST_NAME_TITLES,
  "et.",
  "et",
  "v.",
  "v",
  "záloze",
  "h.",
  "c.",
  "dr.",
]);

const PARTY_LOGOS: Record<string, string> = {
  ANO: "ano.svg",
  ODS: "ods.svg",
  "KDU-ČSL": "kdu-csl.svg",
  KDU: "kdu-csl.svg",
  STAN: "stan.svg",
  Piráti: "pirati.svg",
  "TOP 09": "top09.svg",
  TOP09: "top09.svg",
  TOP: "top09.svg",
  SOCDEM: "socdem.svg",
  ČSSD: "socdem.svg",
  KSČM: "kscm.svg",
  SPD: "spd.svg",
  Zelení: "zeleni.svg",
  Zel: "zeleni.svg",
  "SEN 21": "sen21.svg",
  SEN21: "sen21.svg",
  Trikolora: "trikolora.svg",
  Svobodní: "svobodni.svg",
};

export function getPartyLogoFiles(electoralParty: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const parts = electoralParty.split(/[+·]/).map((p) => p.trim());
  for (const part of parts) {
    let matched = false;
    for (const [key, file] of Object.entries(PARTY_LOGOS)) {
      if (part === key || part.startsWith(key)) {
        if (!seen.has(file)) {
          seen.add(file);
          result.push(file);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (const [key, file] of Object.entries(PARTY_LOGOS)) {
        if (part.includes(key)) {
          if (!seen.has(file)) {
            seen.add(file);
            result.push(file);
          }
          break;
        }
      }
    }
  }
  return result;
}

export function formatCzechName(raw: string): string {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/,+$/, ""));

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

  const firstName = nameParts[nameParts.length - 1];
  const surnames = nameParts.slice(0, -1);

  const preTitles: string[] = [];
  const postGroups: string[] = [];
  let inPost = false;

  for (const t of titleParts) {
    if (POST_NAME_TITLES.has(t)) {
      inPost = true;
      postGroups.push(t);
    } else if (PRE_NAME_TITLES.has(t)) {
      if (inPost) postGroups.push(t);
      else preTitles.push(t);
    } else {
      if (inPost) {
        if (postGroups.length > 0) postGroups[postGroups.length - 1] += " " + t;
        else postGroups.push(t);
      } else {
        preTitles.push(t);
      }
    }
  }

  let result = "";
  if (preTitles.length > 0) result += preTitles.join(" ") + " ";
  result += firstName;
  if (surnames.length > 0) result += " " + surnames.join(" ");
  if (postGroups.length > 0) result += ", " + postGroups.join(", ");

  return result;
}
