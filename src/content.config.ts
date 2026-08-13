import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { file } from "astro/loaders";

const candidates = defineCollection({
  loader: file("./data/candidates.json"),
  schema: z.object({
    districtId: z.number(),
    candidateNumber: z.number(),
    name: z.string(),
    electoralParty: z.string(),
    occupation: z.string(),
    gender: z.enum(["m", "f"]),
    supported: z.boolean(),
    birthYear: z.number().optional(),
    coalition: z.string().optional(),
    signedDeclaration: z.boolean().optional(),
    hlidacStatuUrl: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    web: z.string().optional(),
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
