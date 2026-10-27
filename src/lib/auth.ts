import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authEnabled } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

export type Viewer = { id: string; email: string | null };

/**
 * Whose data a request may touch. `ownerId: null` means local mode (no
 * Supabase settings): one user, every deck.
 */
export type Access = { ownerId: string | null; viewer: Viewer | null };

/** The signed-in user, or null (also null in local mode). */
export async function getViewer(): Promise<Viewer | null> {
  if (!authEnabled) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
}

const claimed = new Set<string>();

/**
 * Decks made before accounts existed have no owner. The first account to sign
 * in takes them over, so nothing is lost when accounts are switched on.
 */
async function claimUnownedDecks(userId: string) {
  if (claimed.has(userId)) return;
  await db.deck.updateMany({ where: { userId: null }, data: { userId } });
  claimed.add(userId);
}

/** For pages and actions that need an account: redirects to /login when signed out. */
export async function requireAccess(next = "/decks"): Promise<Access> {
  if (!authEnabled) return { ownerId: null, viewer: null };
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  await claimUnownedDecks(viewer.id);
  return { ownerId: viewer.id, viewer };
}

/** For route handlers: the access, or null when the caller isn't signed in. */
export async function accessOrNull(): Promise<Access | null> {
  if (!authEnabled) return { ownerId: null, viewer: null };
  const viewer = await getViewer();
  if (!viewer) return null;
  await claimUnownedDecks(viewer.id);
  return { ownerId: viewer.id, viewer };
}

/** Prisma filter limiting decks to the owner (no filter in local mode). */
export function ownedBy(ownerId: string | null) {
  return ownerId ? { userId: ownerId } : {};
}
