import fs from "node:fs";
import path from "node:path";

// SVG path element IDs for the 27 active districts (from the source SVG).
const DISTRICT_PATH: Record<number, string> = {
  3:  "path3593",
  6:  "path3561",
  9:  "path3721",
  12: "path3649",
  15: "path3657",
  18: "path3603",
  21: "path3755",
  24: "path3765",
  27: "path3769",
  30: "path3545",
  33: "path3010",
  36: "path3517",
  39: "path3515",
  42: "path3565",
  45: "path3527",
  48: "path3555",
  51: "path3619",
  54: "path3659",
  57: "path3637",
  60: "path3731",
  63: "path3613",
  66: "path3599",
  69: "path3611",
  72: "path3743",
  75: "path3581",
  78: "path3633",
  81: "path3651",
};

/**
 * One-time preprocessing: reads data-raw/senate-map.svg, cleans it up,
 * stamps data-district-id on each active district path, and writes the
 * result to public/senate-map.svg.
 *
 * Run via: pnpm cli map:process
 */
export function processMapSvg(): void {
  const root = process.cwd();
  let svg = fs.readFileSync(path.resolve(root, "data-raw/senate-map-wikipedia.svg"), "utf-8");

  svg = svg.replace(/<\?xml[^>]+\?>\s*/, "");
  svg = svg.replace(/(\swidth=")([\d.]+)"/, (_m, _p, w) => {
    const h = svg.match(/\sheight="([\d.]+)"/)?.[1] ?? "2990.762";
    return ` viewBox="0 0 ${w} ${h}"`;
  });
  svg = svg.replace(/\sheight="[^"]*"/, "");
  svg = svg.replace(/<text[\s\S]*?\d+<\/tspan><\/text>/g, "");
  svg = svg.replace(/<text[\s\S]*?OBVODY<\/tspan><\/text>/g, "");

  for (const [id, pathId] of Object.entries(DISTRICT_PATH)) {
    svg = svg.replace(
      new RegExp(`(\\sid="${pathId}")`),
      ` data-district-id="${id}"$1`,
    );
  }

  const outPath = path.resolve(root, "public/senate-map.svg");
  fs.writeFileSync(outPath, svg);
  console.log(`Written → ${outPath}`);
}
