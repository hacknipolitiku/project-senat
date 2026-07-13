import { program } from "commander";
import dotenv from "dotenv";
import { glob } from "glob";
import matter from "gray-matter";
import { readFile } from "node:fs/promises";

import { getClient, fetchPerson, savePerson } from "../lib/hlidac-statu.ts";
import { processMapSvg } from "../lib/map.ts";
import { importCsv } from "../lib/statisticky-urad.ts";

dotenv.config({ path: [".env.local", ".env"] });

program
  .command("map:process")
  .description("Process data-raw/senate-map.svg → public/senate-map.svg")
  .action(() => processMapSvg());

program
  .command("csv:import")
  .description("Import CSV candidate data into data/candidates/ markdown profiles")
  .argument("<csv>", "semicolon-separated CSV file to import")
  .action((csvArg: string) => importCsv(csvArg));

program
  .command("hlidac-statu:osoba")
  .description("Import data from Hlidac statu by Osoba ID")
  .argument("osoba-id", "Osoba ID")
  .option("-s, --save", "Save the fetched data to a file")
  .action(async (personId, options) => {
    const token: string = process.env.HLIDAC_STATU_TOKEN as string;
    const client = getClient(token);

    const rawData = await fetchPerson(client, personId);
    if (!rawData) {
      throw new Error(`Person not found ${personId}`);
    }

    if (options.save) {
      await savePerson(rawData);
    }
  });

program
  .command("hlidac-statu:import")
  .description("Import data from Hlidac Statu for all candidates")
  .action(async () => {
    const token: string = process.env.HLIDAC_STATU_TOKEN as string;
    const client = getClient(token);

    // We're doing this instead of using astro:collection
    const files = await glob(`${import.meta.dirname}/../../data/candidates/*.md`);
    const candidates = await Promise.all(
      files.map(async (f: string) => {
        const { data } = matter(await readFile(f, "utf-8"));
        return { id: f, data };
      }),
    );

    for (const candidate of candidates) {
      const personId = candidate.data.hlidacStatuOsobaId;
      if (!personId) {
        console.info("Hlidac id not set up, skipping", { id: candidate.id });
        continue;
      }
      const rawData = await fetchPerson(client, personId);
      if (!rawData) {
        console.error("No data found on Hlidac", { personId });
        continue;
      }

      await savePerson(rawData);
      console.info("Saved", { personId, id: candidate.id });
    }
  });

program.parse();
