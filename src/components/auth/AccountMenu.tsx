"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { supabaseBrowser } from "@/lib/supabase/client";

type User = { email: string; name: string | null } | null;

function toUser(u: { email?: string; user_metadata?: Record<string, unknown> } | null | undefined): User {
  if (!u) return null;
  const name = u.user_metadata?.display_name;
  return { email: u.email ?? "", name: typeof name === "string" && name ? name : null };
}

/**
 * Top-right of the header: Log in / Sign up links, or the signed-in user's
 * profile menu. In local mode (no Supabase settings) the links lead to pages
 * explaining how to switch accounts on.
 */
export function AccountMenu() {
  const supabase = supabaseBrowser();
  const [user, setUser] = useState<User | undefined>(undefined); // undefined: still checking
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(toUser(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(toUser(session?.user)));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (supabase && user === undefined) return <span className="ml-auto h-8 w-8" aria-hidden />;

  if (!supabase || !user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/login"
          className="whitespace-nowrap px-2 py-1.5 text-sm font-medium text-muted hover:text-foreground"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="hidden h-8 items-center rounded-full bg-foreground px-3.5 text-sm font-medium text-background hover:opacity-90 sm:inline-flex"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const initial = ((user.name ?? user.email)[0] ?? "?").toUpperCase();
  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-sun font-semibold text-black ring-2 ring-transparent hover:ring-sun/40"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-60 overflow-hidden rounded-xl border border-border bg-surface py-1 text-sm shadow-xl"
        >
          <div className="border-b border-border px-3 py-2.5">
            <div className="truncate font-medium">{user.name ?? "Signed in"}</div>
            <div className="truncate text-xs text-muted">{user.email}</div>
          </div>
          <Link
            href="/decks"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 hover:bg-surface-2"
          >
            Your decks
          </Link>
          <Link
            href="/account/password"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 hover:bg-surface-2"
          >
            Change password
          </Link>
          <form action={signOut}>
            <button role="menuitem" className="block w-full px-3 py-2.5 text-left text-danger hover:bg-surface-2">
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
