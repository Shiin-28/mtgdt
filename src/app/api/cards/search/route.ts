import type { NextRequest } from "next/server";
import { accessOrNull } from "@/lib/auth";
import { searchCards } from "@/lib/scryfall/client";

// Scryfall full-text search. `commander=1` limits results to legal commanders;
// `filter` adds a Scryfall filter (used for partner / Background suggestions).
export async function GET(req: NextRequest) {
  if (!(await accessOrNull())) return Response.json({ error: "Sign in required" }, { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ cards: [] });
  const commanderOnly = req.nextUrl.searchParams.get("commander") === "1";
  const filter = (req.nextUrl.searchParams.get("filter") ?? "").slice(0, 200);
  try {
    const cards = await searchCards([q, commanderOnly ? "is:commander" : "", filter].filter(Boolean).join(" "));
    return Response.json({
      cards: cards.slice(0, 20).map((c) => ({
        name: c.name,
        typeLine: c.type_line ?? c.card_faces?.[0]?.type_line ?? "",
        imageUrl: c.image_uris?.small ?? c.card_faces?.[0]?.image_uris?.small ?? null,
      })),
    });
  } catch {
    return Response.json({ cards: [], error: "Card search is unavailable right now" }, { status: 502 });
  }
}
