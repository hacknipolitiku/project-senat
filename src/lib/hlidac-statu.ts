import ky from "ky";

export const fetchFromHlidacStatu = async (token: string, osobaId: string) => {
  const client = ky.create({
    baseUrl: "https://api.hlidacstatu.cz",
    headers: {
      Authorization: `Token ${token}`,
    },
  });

  try {
    const data = await client.get(`/api/v2/osoby/${osobaId}`).json();
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${osobaId}`, err);
    return null;
  }
};
