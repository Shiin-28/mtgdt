import { Suspense } from "react";
import { io } from "next/cache";
import { listDecks } from "@/lib/decks";
import { requireAccess } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { DecksBrowser } from "@/components/decks/DecksBrowser";

export const metadata = { title: "Your Decks · MTGDT" };

export default function DecksPage({ searchParams }: PageProps<"/decks">) {
  return (
    <>
      <SiteHeader active="decks" />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <Suspense fallback={<DecksSkeleton />}>
          <DecksLoader searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function DecksLoader({ searchParams }: { searchParams: PageProps<"/decks">["searchParams"] }) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  await io();
  const { ownerId } = await requireAccess("/decks");
  const decks = await listDecks(ownerId);
  return (
    <DecksBrowser decks={decks} initialQuery={first(params.q)?.trim() ?? ""} openNew={first(params.new) === "1"} />
  );
}

function DecksSkeleton() {
  return (
    <div aria-busy>
      <div className="h-12 w-64 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <div className="h-11 animate-pulse rounded-full bg-surface-2" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
        <div className="h-60 animate-pulse rounded-3xl bg-surface-2" />
      </div>
    </div>
  );
}
