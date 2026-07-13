import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob, file } from "astro/loaders";

const candidates = defineCollection({
  loader: glob({ pattern: "*.md", base: "./data/candidates" }),
  schema: z.object({
    districtId: z.number(),
    candidateNumber: z.number(),
    name: z.string(),
    age: z.number(),
    electoralParty: z.string(),
    nominatingParty: z.string(),
    politicalAffiliation: z.string(),
    occupation: z.string(),
    residence: z.string(),
    round1Votes: z.number().optional(),
    round1Percent: z.number().optional(),
    round2Votes: z.number().optional(),
    round2Percent: z.number().optional(),
    hlidacStatuOsobaId: z.string().optional(),
  }),
});

const districts = defineCollection({
  loader: file("./data/districts.json"),
  schema: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  }),
});

const hlidacStatu = defineCollection({
  loader: glob({ pattern: "*.json", base: "./data/hlidac-statu" }),
  schema: z.object({
    sponzoring: z
      .array(
        z.object({
          typ: z.string(),
          organizace: z.string(),
          castka: z.number(),
          datumOd: z.coerce.date(),
        }),
      )
      .default([]),
    udalosti: z
      .array(
        z.object({
          typ: z.string(),
          organizace: z.string(),
          role: z.string(),
          datumOd: z.coerce.date().nullish(),
          datumDo: z.coerce.date().nullish(),
        }),
      )
      .default([]),
  }),
});

export const collections = { candidates, districts, "hlidac-statu": hlidacStatu };
