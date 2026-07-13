import { program } from "commander";
import dotenv from "dotenv";

import { glob } from "glob";
import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getClient, fetchPerson, savePerson } from "../lib/hlidac-statu.ts";

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

    if (options.save) {
      await savePerson(rawData);
    }
  });

program.command("hlidac-statu:refetch").action(async () => {
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
