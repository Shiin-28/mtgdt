"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createDeck } from "@/app/actions";
import { FORMATS } from "@/lib/formats";

export function NewDeckDialog({ onClose }: { onClose: () => void }) {
  const [showList, setShowList] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const submitted = useRef(false);

  // After creating, Next keeps this page mounted but hidden while the new deck
  // opens; hiding runs effect cleanups, so close the dialog then. (Checking
  // `submitted` keeps React's dev-only double mount from closing it early.)
  useEffect(
    () => () => {
      if (submitted.current) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <form
        action={createDeck}
        onSubmit={() => {
          submitted.current = true;
        }}
        role="dialog"
        aria-modal
        aria-labelledby="new-deck-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-auto rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="new-deck-title" className="font-display text-2xl font-semibold">
              New deck
            </h2>
            <p className="text-sm text-muted">Name it now, add cards whenever you like.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full text-xl text-muted hover:bg-surface-2">
            ×
          </button>
        </div>

        <label className="block text-sm font-medium" htmlFor="deck-name">
          Name
        </label>
        <input
          ref={nameRef}
          id="deck-name"
          name="name"
          required
          maxLength={100}
          placeholder="e.g. Niv-Mizzet Spellslinger"
          className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 outline-none focus:border-foreground/50"
        />

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">Format</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {FORMATS.map((f, i) => (
              <label key={f.id} className="cursor-pointer">
                <input type="radio" name="format" value={f.id} defaultChecked={i === 0} className="peer sr-only" />
                <span className="inline-flex h-9 items-center rounded-full border border-border px-3.5 text-sm peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-sun">
                  {f.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          {showList ? (
            <>
              <label className="block text-sm font-medium" htmlFor="deck-list">
                Decklist <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="deck-list"
                name="decklist"
                rows={7}
                placeholder={"1 Sol Ring\n1 Arcane Signet\n1 Command Tower"}
                className="mt-1 w-full rounded-xl border border-border bg-background p-3 font-mono text-sm outline-none focus:border-foreground/50"
              />
              <p className="mt-1 text-xs text-muted">Moxfield, ManaBox and Arena exports work. Cards under &ldquo;Commander&rdquo; become your commander.</p>
            </>
          ) : (
            <button type="button" onClick={() => setShowList(true)} className="text-sm font-medium text-accent">
              + Paste a decklist too
            </button>
          )}
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="mt-6 h-12 w-full rounded-full bg-foreground font-medium text-background disabled:opacity-60"
    >
      {pending ? "Creating… (looking up cards)" : "Create deck"}
    </button>
  );
}
