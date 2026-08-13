import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { downloadCsv } from "./download.ts";

const DEST = join(tmpdir(), `dl-test-${process.pid}.csv`);

/** Swap in a fake global fetch for the duration of `fn`. */
async function withFetch(
  impl: (url: string) => Promise<Response>,
  fn: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string) => impl(url)) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test("rejects when no URL is provided", async () => {
  await assert.rejects(() => downloadCsv("", DEST), /No CSV URL/);
});

test("rejects on a non-ok response", async () => {
  await withFetch(
    async () => new Response("nope", { status: 404, statusText: "Not Found" }),
    async () => {
      await assert.rejects(() => downloadCsv("https://example.test/x.csv", DEST), /404/);
    },
  );
});

test("rejects on an empty body", async () => {
  await withFetch(
    async () => new Response("   \n", { status: 200 }),
    async () => {
      await assert.rejects(() => downloadCsv("https://example.test/x.csv", DEST), /empty/);
    },
  );
});

test("writes the downloaded CSV to the destination", async () => {
  const body = "a;b;c\n1;2;3\n";
  await withFetch(
    async () => new Response(body, { status: 200 }),
    async () => {
      try {
        const written = await downloadCsv("https://example.test/x.csv", DEST);
        assert.equal(readFileSync(written, "utf-8"), body);
      } finally {
        rmSync(DEST, { force: true });
      }
    },
  );
});
