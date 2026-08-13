import { program } from "commander";
import dotenv from "dotenv";

import { DEFAULT_CSV_DEST, downloadCsv } from "../lib/download.ts";
import { DEFAULT_CSV_SRC, DEFAULT_JSON_DEST, preprocessCsvFile } from "../lib/preprocess.ts";
import { processMapSvg } from "../lib/map.ts";

dotenv.config({ path: [".env.local", ".env"] });

program
  .command("data:prepare")
  .description(
    `Preprocess the source CSV → ${DEFAULT_JSON_DEST}. Downloads first if a URL ` +
      `is given / $CANDIDATES_CSV_URL is set, otherwise uses the committed ${DEFAULT_CSV_SRC}.`,
  )
  .argument("[url]", "CSV URL (defaults to $CANDIDATES_CSV_URL)")
  .option("-o, --out <path>", "destination JSON path", DEFAULT_JSON_DEST)
  .action(async (urlArg: string | undefined, options: { out: string }) => {
    const url = urlArg ?? process.env.CANDIDATES_CSV_URL ?? "";
    let csvPath = DEFAULT_CSV_SRC;
    if (url) {
      csvPath = await downloadCsv(url, DEFAULT_CSV_DEST);
      console.log(`Downloaded → ${csvPath}`);
    } else {
      console.log(`No CSV URL set — using committed ${csvPath}`);
    }
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
