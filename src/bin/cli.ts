import { program } from "commander";
import dotenv from "dotenv";
import { fetchFromHlidacStatu } from "../lib/hlidac-statu.ts";

dotenv.config({
  path: [".env.local", ".env"],
});

program
  .command("hlidac-statu:osoba")
  .argument("osoba-id", "Osoba ID")
  .action(async (osobaId, options) => {
    const token: string = process.env.HLIDAC_STATU_TOKEN as string;
    const data = await fetchFromHlidacStatu(token, osobaId);
    console.log(data);
  });

program.parse();
