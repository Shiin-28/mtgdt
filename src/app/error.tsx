"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { Container } from "@/components/Container";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  // Fetch the page again from the server, then clear the error. Plain reset()
  // would re-render the same failed result (e.g. after the server restarted).
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <Container>
      <div className="space-y-3 py-10 text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-muted">The page couldn&rsquo;t load. Your decks are safe.</p>
        <div className="flex justify-center gap-2">
          <button onClick={retry} className="h-10 rounded-lg bg-accent px-4 font-medium text-accent-fg">
            Try again
          </button>
          <Link href="/decks" className="flex h-10 items-center rounded-lg border border-border px-4">
            Your decks
          </Link>
        </div>
      </div>
    </Container>
  );
}
