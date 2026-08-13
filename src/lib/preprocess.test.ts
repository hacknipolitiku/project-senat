import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { parseCandidatesCsv, preprocessCsvFile } from "./preprocess.ts";

const SAMPLE = [
  "Volební obvod;Kandidát.číslo;Kandidát.příjmení, jméno, tituly;Kandidát.věk;Volební strana;Navrhující strana;Politická příslušnost;Povolání;Bydliště;1. kolo.počet hlasů;1. kolo.%;2. kolo.počet hlasů;2. kolo.%",
  "3;1;Sedláček Jiří Ing.;64;Trikolora;Trikolora;BEZPP;jednatel společnosti;Tachov;1613;5,64;0;0,00",
  "3;3;Brožová Lampertová Jaroslava Ing.;66;ANO;ANO;ANO;starostka;Velká Hleďsebe;4927;17,24;3091;29,68",
].join("\n");

test("parses core candidate fields", () => {
  const candidates = parseCandidatesCsv(SAMPLE);
  assert.equal(candidates.length, 2);
  assert.deepEqual(
    {
      id: candidates[0].id,
      districtId: candidates[0].districtId,
      candidateNumber: candidates[0].candidateNumber,
      name: candidates[0].name,
      age: candidates[0].age,
      electoralParty: candidates[0].electoralParty,
      occupation: candidates[0].occupation,
      residence: candidates[0].residence,
    },
    {
      id: "3-1",
      districtId: 3,
      candidateNumber: 1,
      name: "Sedláček Jiří Ing.",
      age: 64,
      electoralParty: "Trikolora",
      occupation: "jednatel společnosti",
      residence: "Tachov",
    },
  );
});

test("parses Czech-locale percentages and round-2 results", () => {
  const [first, second] = parseCandidatesCsv(SAMPLE);
  assert.equal(first.round1Percent, 5.64);
  assert.equal(first.round2Votes, 0);
  assert.equal(second.round2Votes, 3091);
  assert.equal(second.round2Percent, 29.68);
});

test("skips blank lines and omits optional vote fields when absent", () => {
  const csv = ["header", "3;5;Novák Jan;40;ANO;ANO;ANO;učitel;Cheb;;;;", "", "  "].join("\n");
  const [c] = parseCandidatesCsv(csv);
  assert.equal(parseCandidatesCsv(csv).length, 1);
  assert.equal(c.round1Votes, undefined);
  assert.equal(c.round2Percent, undefined);
});

test("preprocessCsvFile writes a JSON array with stable ids", () => {
  const src = join(tmpdir(), `pp-src-${process.pid}.csv`);
  const out = join(tmpdir(), `pp-out-${process.pid}.json`);
  writeFileSync(src, SAMPLE);
  try {
    const count = preprocessCsvFile(src, out);
    assert.equal(count, 2);
    const parsed = JSON.parse(readFileSync(out, "utf-8"));
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].id, "3-1");
    assert.equal(parsed[1].id, "3-3");
  } finally {
    rmSync(src, { force: true });
    rmSync(out, { force: true });
  }
});
