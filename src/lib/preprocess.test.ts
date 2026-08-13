import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { guessGender, parseCandidatesCsv, preprocessCsvFile } from "./preprocess.ts";

const HEADER =
  "Volební obvod;Kandidát.číslo;Kandidát.příjmení, jméno, tituly;Kandidát.věk;Volební strana;Navrhující strana;Politická příslušnost;Povolání;Bydliště;1. kolo.počet hlasů;1. kolo.%;2. kolo.počet hlasů;2. kolo.%;Podepsal deklaraci;Hlídač státu URL;Twitter;Instagram;Zobrazit formulář";

const SAMPLE = [
  HEADER,
  "3;1;Sedláček Jiří Ing.;64;Trikolora;Trikolora;BEZPP;jednatel společnosti;Tachov;1613;5,64;0;0,00;Ano;https://www.hlidacstatu.cz/osoba/jiri-sedlacek;@jsedlacek;https://instagram.com/jsedlacek_ig/;Ano",
  "3;3;Brožová Lampertová Jaroslava Ing.;66;ANO;ANO;ANO;starostka;Velká Hleďsebe;4927;17,24;3091;29,68;;;;;",
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

test("parses declaration, socials and form columns when present", () => {
  const [first] = parseCandidatesCsv(SAMPLE);
  assert.equal(first.signedDeclaration, true);
  assert.equal(first.hlidacStatuUrl, "https://www.hlidacstatu.cz/osoba/jiri-sedlacek");
  assert.equal(first.twitter, "jsedlacek"); // "@" stripped
  assert.equal(first.instagram, "jsedlacek_ig"); // reduced from full URL
  assert.equal(first.showForm, true);
});

test("omits new fields when their cells are empty", () => {
  const [, second] = parseCandidatesCsv(SAMPLE);
  assert.equal(second.signedDeclaration, undefined);
  assert.equal(second.hlidacStatuUrl, undefined);
  assert.equal(second.twitter, undefined);
  assert.equal(second.instagram, undefined);
  assert.equal(second.showForm, undefined);
});

test("guesses gender from the name", () => {
  // Feminine surname (-á / -ová)
  assert.equal(guessGender("Brožová Lampertová Jaroslava Ing."), "f");
  assert.equal(guessGender("Monsportová Markéta"), "f");
  // Masculine
  assert.equal(guessGender("Sedláček Jiří Ing."), "m");
  assert.equal(guessGender("Švarcbek Josef RSDr."), "m");
  // Foreign/indeclinable surname → fall back to first name ending
  assert.equal(guessGender("Nguyen Jana"), "f");
  assert.equal(guessGender("Svoboda Ilja"), "m"); // male name ending in -a
});

test("populates gender on every parsed candidate", () => {
  const [first, second] = parseCandidatesCsv(SAMPLE);
  assert.equal(first.gender, "m"); // Sedláček Jiří
  assert.equal(second.gender, "f"); // Brožová ... Jaroslava
});

test("maps columns by header name, not position (reordered CSV)", () => {
  // Twitter before the name, votes omitted entirely — header order differs.
  const reordered = [
    "Twitter;Kandidát.věk;Volební obvod;Kandidát.číslo;Kandidát.příjmení, jméno, tituly;Podepsal deklaraci",
    "novak_x;40;6;2;Novák Jan;ano",
  ].join("\n");
  const [c] = parseCandidatesCsv(reordered);
  assert.equal(c.id, "6-2");
  assert.equal(c.name, "Novák Jan");
  assert.equal(c.age, 40);
  assert.equal(c.twitter, "novak_x");
  assert.equal(c.signedDeclaration, true);
});

test("skips blank lines and treats absent optional columns as empty", () => {
  const csv = [HEADER, "3;5;Novák Jan;40;ANO;ANO;ANO;učitel;Cheb;;;;;;;;;", "", "  "].join("\n");
  const parsed = parseCandidatesCsv(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].round1Votes, undefined);
  assert.equal(parsed[0].showForm, undefined);
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
