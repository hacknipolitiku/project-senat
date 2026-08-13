import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { file } from "astro/loaders";

const candidates = defineCollection({
  loader: file("./data/candidates.json"),
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

export const collections = { candidates, districts };
