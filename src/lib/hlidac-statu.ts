import ky, { type KyInstance } from "ky";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";

type HSClient = KyInstance;

type HSPerson = Record<string, unknown> & {
  nameId: string;
};

export const getClient = (token: string): HSClient => {
  if (!token) {
    throw new Error("Missing token for hlidac statu");
  }
  return ky.create({
    baseUrl: "https://api.hlidacstatu.cz",
    headers: {
      Authorization: `Token ${token}`,
    },
  });
};

export const fetchPerson = async (client: HSClient, personId: string): Promise<HSPerson | null> => {
  try {
    const data = await client.get(`/api/v2/osoby/${personId}`).json();
    return data as HSPerson;
  } catch (err) {
    console.error(`Failed to fetch ${personId}`, err);
    return null;
  }
};

export const savePerson = async (
  rawData: Record<string, unknown> & { nameId: string },
): Promise<void> => {
  const data = {
    meta: {
      fetchedAt: new Date().toISOString(),
    },
    ...rawData,
  };

  const path = join(import.meta.dirname, "../..", "data", "hlidac-statu", `${rawData.nameId}.json`);

  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
};
