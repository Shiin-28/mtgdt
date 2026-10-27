import { Container } from "@/components/Container";
import { STORES } from "@/lib/stores";

export const metadata = { title: "Stores we check · MTGDT" };

const LABEL = {
  supported: { text: "Checked automatically", className: "text-owned" },
  partial: { text: "Checked, some prices on store only", className: "text-missing" },
  unsupported: { text: "Not checked: link only", className: "text-muted" },
} as const;

export default function StoresPage() {
  return (
    <Container active="more">
      <h1 className="mb-1 text-lg font-semibold">Stores we check</h1>
      <p className="mb-4 text-sm text-muted">
        We only look up cards you&rsquo;re missing, follow each store&rsquo;s robots.txt, and send at most one request every
        1.5 seconds per store. Results are cached for 12 hours.
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {STORES.map((s) => (
          <li key={s.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                {s.name}
              </a>
              <span className={`shrink-0 text-xs font-medium ${LABEL[s.support].className}`}>{LABEL[s.support].text}</span>
            </div>
            {s.note && <p className="mt-0.5 text-sm text-muted">{s.note}</p>}
          </li>
        ))}
      </ul>
    </Container>
  );
}
