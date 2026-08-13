import { program } from "commander";
import dotenv from "dotenv";

import { DEFAULT_CSV_DEST, downloadCsv } from "../lib/download.ts";
import { DEFAULT_CSV_SRC, DEFAULT_JSON_DEST, preprocessCsvFile } from "../lib/preprocess.ts";
import { processMapSvg } from "../lib/map.ts";

dotenv.config({ path: [".env.local", ".env"] });

program
  .command("data:prepare")
  .description(`Download the source CSV and preprocess it → ${DEFAULT_JSON_DEST}`)
  .argument("[url]", "CSV URL (defaults to $CANDIDATES_CSV_URL)")
  .option("-o, --out <path>", "destination JSON path", DEFAULT_JSON_DEST)
  .action(async (urlArg: string | undefined, options: { out: string }) => {
    const url = urlArg ?? process.env.CANDIDATES_CSV_URL ?? "";
    const csvPath = await downloadCsv(url, DEFAULT_CSV_DEST);
    console.log(`Downloaded → ${csvPath}`);
    const count = preprocessCsvFile(csvPath, options.out);
    console.log(`Wrote ${count} candidates → ${options.out}`);
  });

program
  .command("data:preprocess")
  .description(`Preprocess a local CSV → ${DEFAULT_JSON_DEST} (no download)`)
  .argument("[csv]", "source CSV path", DEFAULT_CSV_SRC)
  .option("-o, --out <path>", "destination JSON path", DEFAULT_JSON_DEST)
  .action((csvArg: string, options: { out: string }) => {
    const count = preprocessCsvFile(csvArg, options.out);
    console.log(`Wrote ${count} candidates → ${options.out}`);
  });

program
  .command("map:process")
  .description("Process data-raw/senate-map.svg → public/senate-map.svg")
  .action(() => processMapSvg());

program.parse();
