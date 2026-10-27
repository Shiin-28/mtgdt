"use client";

import { useState } from "react";
import { importCards } from "@/app/actions";
import type { DeckView, ImportReport } from "@/lib/decks";

const PLACEHOLDER = `1 Sol Ring
1 Arcane Signet (CMM) 937
1 Command Tower
1 Delver of Secrets // Insectile Aberration`;

export function ImportDialog({
  deckId,
  onImported,
  onClose,
}: {
  deckId: string;
  onImported: (deck: DeckView) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await importCards(deckId, text, mode).catch(() => null);
    setBusy(false);
    if (!res) return setError("Import failed. Check your connection and try again.");
    if (!res.ok) return setError(res.error);
    onImported(res.data.deck);
    setReport(res.data.report);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="import-title"
        className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-t-2xl bg-surface p-4 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="import-title" className="text-lg font-semibold">
            Import decklist
          </h2>
          <button onClick={onClose} className="h-9 rounded-lg px-3 text-muted hover:bg-surface-2">
            Close
          </button>
        </div>

        {report ? (
          <ImportSummary report={report} onDone={onClose} onAgain={() => { setReport(null); setText(""); }} />
        ) : (
          <>
            <p className="mb-2 text-sm text-muted">
              Paste one card per line. Plain names, &ldquo;1 Sol Ring&rdquo;, and Moxfield, ManaBox or
              Arena exports all work. Headers like &ldquo;Commander&rdquo; or &ldquo;Sideboard&rdquo; are skipped.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={PLACEHOLDER}
              className="w-full rounded-lg border border-border bg-background p-3 font-mono text-sm outline-none focus:border-accent"
            />
            <fieldset className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "add"} onChange={() => setMode("add")} />
                Add to deck
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
                Replace deck contents
              </label>
            </fieldset>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <button
              onClick={submit}
              disabled={busy || !text.trim()}
              className="mt-4 h-11 w-full rounded-lg bg-accent font-medium text-accent-fg disabled:opacity-50"
            >
              {busy ? "Looking up cards on Scryfall…" : "Import"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ImportSummary({
  report,
  onDone,
  onAgain,
}: {
  report: ImportReport;
  onDone: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-1">
        <li>
          <b className="tabular">{report.added}</b> cards added
          {report.updated > 0 && <>, <b className="tabular">{report.updated}</b> updated</>}
          {report.removed > 0 && <>, <b className="tabular">{report.removed}</b> removed</>}
        </li>
        {report.mergedLines > 0 && <li className="text-muted">{report.mergedLines} duplicate lines merged</li>}
        {report.headers.length > 0 && (
          <li className="text-muted">Skipped headers: {report.headers.join(", ")}</li>
        )}
      </ul>
      {report.notFound.length > 0 && (
        <div className="rounded-lg border border-danger/40 p-3">
          <p className="mb-1 font-medium text-danger">Not found on Scryfall ({report.notFound.length})</p>
          <ul className="list-inside list-disc text-muted">
            {report.notFound.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onDone} className="h-11 flex-1 rounded-lg bg-accent font-medium text-accent-fg">
          Done
        </button>
        <button onClick={onAgain} className="h-11 flex-1 rounded-lg border border-border">
          Import more
        </button>
      </div>
    </div>
  );
}
