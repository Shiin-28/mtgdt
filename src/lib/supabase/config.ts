/**
 * Supabase project settings. Both values are safe to expose to the browser.
 * When they're missing the app runs in single-user "local mode" without accounts.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
