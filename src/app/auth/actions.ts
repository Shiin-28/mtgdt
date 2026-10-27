"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase/config";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Form result. `email` is echoed back so the form can keep it after an error. */
export type AuthState = { error?: string; message?: string; email?: string } | undefined;

const MIN_PASSWORD = 8;

/** Only redirect to paths on this site ("/decks"), never to another domain. */
function safeNext(raw: FormDataEntryValue | string | null | undefined, fallback = "/decks"): string {
  const next = typeof raw === "string" ? raw : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** This site's origin, for links in Supabase emails. */
async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const NOT_SET_UP = { error: "Accounts aren't set up yet. Add your Supabase keys to .env (see README)." };

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled) return NOT_SET_UP;
  const email = String(form.get("email") ?? "").trim();
  const withEmail = (s: NonNullable<AuthState>): AuthState => ({ ...s, email });
  const password = String(form.get("password") ?? "");
  if (!email || !password) return withEmail({ error: "Enter your email and password." });
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (!error.status || error.status >= 500)
      return withEmail({ error: "Can't reach the account service right now. Try again." });
    if (/confirm/i.test(error.message))
      return withEmail({ error: "Please confirm your email first. Check your inbox for the link." });
    return withEmail({ error: "Wrong email or password." });
  }
  redirect(safeNext(form.get("next")));
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled) return NOT_SET_UP;
  const email = String(form.get("email") ?? "").trim();
  const withEmail = (s: NonNullable<AuthState>): AuthState => ({ ...s, email });
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const displayName = String(form.get("displayName") ?? "")
    .trim()
    .slice(0, 40);
  if (!/^\S+@\S+\.\S+$/.test(email)) return withEmail({ error: "Enter a valid email address." });
  if (password.length < MIN_PASSWORD)
    return withEmail({ error: `Use at least ${MIN_PASSWORD} characters for your password.` });
  if (password !== confirm) return withEmail({ error: "The passwords don't match." });

  const supabase = await createSupabaseServer();
  const next = safeNext(form.get("next"));
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) return withEmail({ error: error.message });
  // With email confirmation off in Supabase, the user is signed in right away.
  if (data.session) redirect(next);
  return withEmail({ message: `We sent a confirmation link to ${email}. Open it to finish creating your account.` });
}

export async function signOut() {
  if (authEnabled) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled) return NOT_SET_UP;
  const email = String(form.get("email") ?? "").trim();
  const withEmail = (s: NonNullable<AuthState>): AuthState => ({ ...s, email });
  if (!/^\S+@\S+\.\S+$/.test(email)) return withEmail({ error: "Enter a valid email address." });
  const supabase = await createSupabaseServer();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/account/password`,
  });
  // Same answer whether or not the account exists, so emails can't be probed.
  return withEmail({ message: `If ${email} has an account, a reset link is on its way.` });
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled) return NOT_SET_UP;
  await requireAccess("/account/password");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for your password.` };
  if (password !== confirm) return { error: "The passwords don't match." };
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { message: "Password updated." };
}
