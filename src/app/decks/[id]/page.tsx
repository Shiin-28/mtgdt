import { Suspense } from "react";
import { notFound } from "next/navigation";
import { io } from "next/cache";
import { getDeck } from "@/lib/decks";
import { requireAccess } from "@/lib/auth";
import { Container } from "@/components/Container";
import { DeckEditor } from "@/components/DeckEditor";

export default function DeckPage({ params }: PageProps<"/decks/[id]">) {
  return (
    <Container active="decks" wide>
      <Suspense fallback={<DeckSkeleton />}>
        <DeckLoader params={params} />
      </Suspense>
    </Container>
  );
}

async function DeckLoader({ params }: { params: PageProps<"/decks/[id]">["params"] }) {
  const { id } = await params;
  await io();
  const { ownerId } = await requireAccess(`/decks/${id}`);
  const deck = await getDeck(id, ownerId);
  if (!deck) notFound();
  return <DeckEditor key={deck.id} initial={deck} />;
}

function DeckSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-8 w-2/3 animate-pulse rounded bg-surface-2" />
      <div className="h-2.5 animate-pulse rounded-full bg-surface-2" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-surface" />
      ))}
    </div>
  );
}
