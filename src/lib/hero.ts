import { cacheLife } from "next/cache";

export type HeroCard = { imageUrl: string; cardName: string };

type RandomCard = {
  name: string;
  image_uris?: { normal?: string };
  card_faces?: { image_uris?: { normal?: string } }[];
};

/** A random recent commander card image from Scryfall, picked once a day. */
async function loadHeroCard(): Promise<HeroCard> {
  "use cache";
  cacheLife("days");
  const res = await fetch(
    "https://api.scryfall.com/cards/random?q=" +
      encodeURIComponent("is:commander unique:art -is:digital year>=2020"),
    {
      headers: {
        "User-Agent": process.env.SCRYFALL_USER_AGENT ?? "MTGDeckTracker/0.1 (personal Commander deck tracker)",
        Accept: "application/json;q=0.9,*/*;q=0.8",
      },
    },
  );
  if (!res.ok) throw new Error(`Scryfall ${res.status}`); // errors aren't cached
  const card = (await res.json()) as RandomCard;
  const imageUrl = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  if (!imageUrl) throw new Error("No image");
  return { imageUrl, cardName: card.name };
}

export async function getHeroCard(): Promise<HeroCard | null> {
  try {
    return await loadHeroCard();
  } catch {
    return null;
  }
}
