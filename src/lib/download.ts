import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** Where the download step writes the source CSV by default. */
export const DEFAULT_CSV_DEST = "data-raw/vsichni-platni-kandidati.csv";

/**
 * Build stage 1 — download the source candidates CSV.
 *
 * Fetches `url` and writes the raw CSV to `destPath`. The URL is never
 * hardcoded: the CLI passes it from an argument or the `CANDIDATES_CSV_URL`
 * env var. Returns the absolute path written.
 */
export async function downloadCsv(
  url: string,
  destPath: string = DEFAULT_CSV_DEST,
): Promise<string> {
  if (!url) {
    throw new Error("No CSV URL provided. Pass a URL argument or set CANDIDATES_CSV_URL.");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download CSV from ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const csv = await response.text();
  if (!csv.trim()) {
    throw new Error(`Downloaded CSV from ${url} is empty`);
  }

  const abs = resolve(destPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, csv, "utf-8");
  return abs;
}
