import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Landing page for links in Supabase emails (confirm sign-up, reset password).
 * Handles both the PKCE `code` link and the `token_hash` link styles, then
 * sends the user on to `next`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const rawNext = url.searchParams.get("next") ?? "/decks";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/decks";
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(reason)}`, url.origin));

  if (!authEnabled) return fail("Accounts aren't set up yet.");
  const supabase = await createSupabaseServer();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("That link has expired or was already used. Try again.");
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail("That link has expired or was already used. Try again.");
  } else {
    return fail("That link is missing information. Try again.");
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
