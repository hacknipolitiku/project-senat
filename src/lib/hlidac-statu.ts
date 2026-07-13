import ky, { type KyInstance } from "ky";

type HSClient = KyInstance;

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

export const fetchPerson = async (client: HSClient, personId: string) => {
  try {
    const data = await client.get(`/api/v2/osoby/${personId}`).json();
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${personId}`, err);
    return null;
  }
};
