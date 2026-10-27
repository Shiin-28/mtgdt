import Link from "next/link";
import { Container } from "@/components/Container";

export default function NotFound() {
  return (
    <Container>
      <div className="space-y-3 py-10 text-center">
        <h1 className="text-lg font-semibold">Deck not found</h1>
        <p className="text-muted">It may have been deleted.</p>
        <Link href="/decks" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 font-medium text-accent-fg">
          Your decks
        </Link>
      </div>
    </Container>
  );
}
