import type { NextRequest } from "next/server";
import { accessOrNull } from "@/lib/auth";
import { autocomplete } from "@/lib/scryfall/client";

export async function GET(req: NextRequest) {
  if (!(await accessOrNull())) return Response.json({ error: "Sign in required" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    return Response.json({ names: await autocomplete(q) });
  } catch {
    return Response.json({ names: [], error: "Card search is unavailable right now" }, { status: 502 });
  }
}
