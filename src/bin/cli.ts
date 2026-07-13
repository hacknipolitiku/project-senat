import { program } from "commander";
import dotenv from "dotenv";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getClient, fetchPerson } from "../lib/hlidac-statu.ts";

dotenv.config({
  path: [".env.local", ".env"],
});

program
  .command("hlidac-statu:osoba")
  .argument("osoba-id", "Osoba ID")
  .option("-s, --save", "Save the fetched data to a file")
  .action(async (personId, options) => {
    const token: string = process.env.HLIDAC_STATU_TOKEN as string;
    const client = getClient(token);

    const rawData = await fetchPerson(client, personId);
    if (!rawData) {
      throw new Error(`Person not found ${personId}`);
    }

    if (rawData && options.save) {
      const data = {
        meta: {
          fetchedAt: new Date().toISOString(),
        },
        ...rawData,
      };

      const path = join(
        import.meta.dirname,
        "../..",
        "data",
        "hlidac-statu",
        "osoby",
        `${personId}.json`,
      );

      await writeFile(path, JSON.stringify(data, null, 2), "utf8");
    }
  });

program.parse();
