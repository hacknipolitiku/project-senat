import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { guessGender, parseCandidatesCsv, parseCsvRows, preprocessCsvFile } from "./preprocess.ts";

// Header has multi-line quoted cells, like the real export.
const HEADER =
  'Okres;"Podporujeme?\n(Ano/Ne)";Příjmení;Jméno;Tituly;"Datum\nnarození";Povolání;Nominace;Podpora;Hlídač státu;FB;Insta;Web;Média 1;Média 2;Podepsána Deklarace?;Kontakt pro dobrovolníky';

// Row 1: supported male, all links; Média cell is quoted and contains a ";" (via &amp;).
const ROW1 =
  '3 – Cheb;ANO;Plevný;Miroslav;prof. Dr. Ing.;1965;senátor;STAN;TOP09, Zelení;https://www.hlidacstatu.cz/osoba/miroslav-plevny;https://www.facebook.com/senator;@senator_plevny;https://www.plevny.cz/;"https://media.cz/a?x=1&amp;y=2";https://media.cz/b;ANO;';
// Row 2: female, not supported, declaration "čekáme", Hlídač & Insta are "0" sentinels.
const ROW2 =
  "6 – Louny;NE;Černá;Štěpánka;Mgr., MBA;1977;ředitelka;VOK;;0;https://www.facebook.com/cerna;0;https://cerna.cz/;;;čekáme;";

const SAMPLE = [HEADER, ROW1, ROW2].join("\n");

test("tokenizer honours quoted delimiters and embedded newlines", () => {
  const rows = parseCsvRows(SAMPLE);
  // 3 logical rows despite the newlines inside the quoted header cells.
  assert.equal(rows.length, 3);
  // 17 columns, and the ";" inside the quoted Média URL did NOT split the row.
  assert.equal(rows[1].length, 17);
  assert.equal(rows[1][13], "https://media.cz/a?x=1&amp;y=2");
});

test("parses core fields, splitting district and composing the name", () => {
  const [first] = parseCandidatesCsv(SAMPLE);
  assert.equal(first.id, "3-1");
  assert.equal(first.districtId, 3);
  assert.equal(first.name, "Plevný Miroslav prof. Dr. Ing.");
  assert.equal(first.electoralParty, "STAN");
  assert.equal(first.occupation, "senátor");
  assert.equal(first.birthYear, 1965);
  assert.equal(first.coalition, "TOP09, Zelení");
});

test("aligns columns after a quoted field with an embedded semicolon", () => {
  // If the Média ";" had leaked, these later columns would be shifted/wrong.
  const [first] = parseCandidatesCsv(SAMPLE);
  assert.equal(first.web, "https://www.plevny.cz/");
  assert.equal(first.instagram, "senator_plevny");
  assert.equal(first.signedDeclaration, true);
});

test("supported + declaration are truthy-only; validates URLs and handles", () => {
  const [first, second] = parseCandidatesCsv(SAMPLE);
  assert.equal(first.supported, true);
  assert.equal(first.hlidacStatuUrl, "https://www.hlidacstatu.cz/osoba/miroslav-plevny");
  assert.equal(first.facebook, "https://www.facebook.com/senator");

  // Row 2: NE, "čekáme", and "0" sentinels → falsey/omitted.
  assert.equal(second.supported, false);
  assert.equal(second.signedDeclaration, undefined);
  assert.equal(second.hlidacStatuUrl, undefined); // "0"
  assert.equal(second.instagram, undefined); // "0"
  assert.equal(second.facebook, "https://www.facebook.com/cerna");
  assert.equal(second.districtId, 6);
});

test("rejects non-URL Hlídač free text", () => {
  const csv = [
    HEADER,
    "9 – Plzeň-město;ANO;Chalupský;Jaroslav;Ing.;1970;úředník;ODS;;Ing. Jaroslav Chalupský - Hlídač státu.;;;;;;ANO;",
  ].join("\n");
  const [c] = parseCandidatesCsv(csv);
  assert.equal(c.hlidacStatuUrl, undefined);
});

test("assigns a per-district running candidateNumber", () => {
  const csv = [HEADER, ROW1, "3 – Cheb;NE;Nováková;Jana;;1980;učitelka;ANO;;0;;;;;;;", ROW2].join(
    "\n",
  );
  const c = parseCandidatesCsv(csv);
  assert.deepEqual(
    c.map((x) => x.id),
    ["3-1", "3-2", "6-1"],
  );
});

test("guesses gender from the name", () => {
  assert.equal(guessGender("Černá Štěpánka Mgr., MBA"), "f");
  assert.equal(guessGender("Plevný Miroslav prof. Dr. Ing."), "m");
  assert.equal(guessGender("Nguyen Jana"), "f"); // foreign surname → first-name fallback
  assert.equal(guessGender("Svoboda Ilja"), "m"); // male name ending in -a
});

test("populates gender on every parsed candidate", () => {
  const [first, second] = parseCandidatesCsv(SAMPLE);
  assert.equal(first.gender, "m");
  assert.equal(second.gender, "f");
});

test("preprocessCsvFile writes a JSON array", () => {
  const src = join(tmpdir(), `pp-src-${process.pid}.csv`);
  const out = join(tmpdir(), `pp-out-${process.pid}.json`);
  writeFileSync(src, SAMPLE);
  try {
    const count = preprocessCsvFile(src, out);
    assert.equal(count, 2);
    const parsed = JSON.parse(readFileSync(out, "utf-8"));
    assert.equal(parsed[0].id, "3-1");
    assert.equal(parsed[1].id, "6-1");
  } finally {
    rmSync(src, { force: true });
    rmSync(out, { force: true });
  }
});
