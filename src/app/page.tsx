import Link from "next/link";
import { Suspense, cache } from "react";
import { io } from "next/cache";
import { homeData, type HomeData } from "@/lib/home";
import { accessOrNull } from "@/lib/auth";
import { STORES } from "@/lib/stores";
import { SiteHeader } from "@/components/SiteHeader";
import { SunMark } from "@/components/SunMark";

// The fan and the bento grid share one load per request.
const getHomeData = cache(async () => {
  await io();
  // Signed out (with accounts on) shows no decks; local mode shows all decks.
  const access = await accessOrNull();
  const data = await homeData(access ? access.ownerId : null, access === null);
  return { ...data, signedOut: access === null };
});

export default function Home() {
  return (
    <>
      <SiteHeader active="home" />

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-6 px-4 pb-4 pt-10 md:grid-cols-2 md:gap-10 md:pb-12 md:pt-14">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            <SunMark size={14} className="text-sun" />
            Commander · Philippines
          </p>
          <h1 className="font-display text-[clamp(2.5rem,6.5vw,4.25rem)] font-semibold leading-[1] tracking-tight">
            Build it. Own it.
            <br />
            <span className="text-sun">Find the rest.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Keep every Commander deck in one place, mark the cards you already have, and see which local store has the
            rest for the lowest price.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/decks?new=1"
              className="inline-flex h-12 items-center rounded-full bg-foreground px-6 font-medium text-background hover:opacity-90"
            >
              Start a deck
            </Link>
            <Link
              href="/decks"
              className="inline-flex h-12 items-center rounded-full border border-border bg-surface px-6 font-medium hover:border-foreground/40"
            >
              Your decks
            </Link>
          </div>
        </div>

        <Suspense fallback={<FanSkeleton />}>
          <CardFan />
        </Suspense>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-12">
        <form action="/decks" className="mb-6">
          <label htmlFor="home-search" className="sr-only">
            Find a deck
          </label>
          <div className="flex h-14 items-center gap-3 rounded-2xl border border-border bg-surface px-5 shadow-sm focus-within:border-foreground/40">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0 text-muted">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Find a deck or commander"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
          </div>
        </form>

        <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-surface-2" />}>
          <Bento />
        </Suspense>
      </section>
    </>
  );
}

/* ---------- hero fan ---------- */

async function CardFan() {
  const { fan } = await getHomeData();
  return (
    <div className="fan relative h-[250px] select-none overflow-x-clip sm:h-[360px] md:overflow-visible" aria-hidden>
      {fan.length
        ? fan.map((c, i) => {
            const offset = i - (fan.length - 1) / 2;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={c.imageUrl}
                src={c.imageUrl}
                alt=""
                style={{ "--x": offset * 82, "--r": offset * 8 } as React.CSSProperties}
                className="fan-card absolute left-1/2 top-4 w-32 rounded-[4.75%/3.5%] shadow-xl shadow-black/25 sm:top-8 sm:w-44"
              />
            );
          })
        : [-1, 0, 1].map((offset) => (
            <div
              key={offset}
              style={{ "--x": offset * 82, "--r": offset * 8 } as React.CSSProperties}
              className="fan-card absolute left-1/2 top-4 flex aspect-[5/7] w-32 items-center justify-center rounded-xl border border-border bg-surface shadow-xl shadow-black/10 sm:top-8 sm:w-44"
            >
              <SunMark size={48} className="text-sun/60" />
            </div>
          ))}
    </div>
  );
}

function FanSkeleton() {
  return (
    <div className="fan relative h-[250px] overflow-x-clip sm:h-[360px] md:overflow-visible" aria-hidden>
      {[-1, 0, 1].map((offset) => (
        <div
          key={offset}
          style={{ "--x": offset * 82, "--r": offset * 8 } as React.CSSProperties}
          className="fan-card absolute left-1/2 top-4 aspect-[5/7] w-32 animate-pulse rounded-xl bg-surface-2 sm:top-8 sm:w-44"
        />
      ))}
    </div>
  );
}

/* ---------- bento grid ---------- */

async function Bento() {
  const data = await getHomeData();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {data.signedOut ? (
        <SignedOutTile />
      ) : (
        <>
          <ContinueTile latest={data.latest} />
          <StatTile
            label="Cards to find"
            value={data.cardsToFind}
            sub={
              data.decks.length
                ? `across ${data.decks.length} ${data.decks.length === 1 ? "deck" : "decks"}`
                : "no decks yet"
            }
          />
          <DecksTile decks={data.decks} />
        </>
      )}
      <StoresTile />
      <HowTile />
    </div>
  );
}

const tile = "rounded-3xl border border-border bg-surface p-5";

function ContinueTile({ latest }: { latest: HomeData["latest"] }) {
  if (!latest) {
    return (
      <Link
        href="/decks?new=1"
        className={`${tile} col-span-2 flex min-h-56 flex-col justify-end bg-foreground text-background md:row-span-2`}
      >
        <SunMark size={36} className="mb-auto text-sun" />
        <div className="font-display text-3xl font-semibold leading-tight">Start your first deck</div>
        <p className="mt-1 text-sm opacity-75">
          Paste a list from Moxfield, ManaBox or Arena, or add cards one by one.
        </p>
      </Link>
    );
  }
  const pct = latest.total ? Math.round((latest.owned / latest.total) * 100) : 0;
  return (
    <Link
      href={`/decks/${latest.id}`}
      className="group relative col-span-2 flex min-h-64 flex-col justify-end overflow-hidden rounded-3xl bg-zinc-900 p-5 text-white md:row-span-2"
    >
      {latest.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={latest.imageUrl.replace("/normal/", "/art_crop/")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="relative">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sun">Continue building</div>
        <div className="mt-1 font-display text-3xl font-semibold leading-tight">{latest.name}</div>
        <div className="text-sm text-white/75">{latest.commanders.join(" + ") || "No commander set"}</div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-sun" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="tabular">
            {latest.owned}/{latest.total} owned · {latest.missingCards} to find
          </span>
          <span className="font-medium">Open →</span>
        </div>
      </div>
    </Link>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className={`${tile} col-span-2 flex flex-col md:col-span-1`}>
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">{label}</div>
      <div className="mt-auto pt-4 font-display text-5xl font-semibold tabular leading-none">{value}</div>
      <div className="mt-1 text-sm text-muted">{sub}</div>
    </div>
  );
}

function DecksTile({ decks }: { decks: HomeData["decks"] }) {
  return (
    <div className={`${tile} col-span-2 flex flex-col md:col-span-1`}>
      <div className="flex items-center justify-between gap-2">
        <div className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Decks <span className="tabular">· {decks.length}</span>
        </div>
        <Link
          href="/decks?new=1"
          className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full bg-foreground px-3 text-xs font-medium text-background hover:opacity-90"
        >
          + New
        </Link>
      </div>
      {decks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No decks yet.</p>
      ) : (
        <ul className="-mx-2 mt-3 space-y-0.5">
          {decks.slice(0, 3).map((d) => {
            const pct = d.total ? Math.round((d.owned / d.total) * 100) : 0;
            return (
              <li key={d.id}>
                <Link
                  href={`/decks/${d.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-surface-2"
                >
                  {d.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.imageUrl.replace("/normal/", "/art_crop/")}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="h-7 w-7 shrink-0 rounded-lg bg-surface-2" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <span className="shrink-0 text-xs text-muted tabular">{pct}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {decks.length > 3 && (
        <Link href="/decks" className="mt-auto pt-2 text-xs text-muted hover:text-foreground">
          See all {decks.length} →
        </Link>
      )}
    </div>
  );
}

function StoresTile() {
  const dot = { supported: "bg-owned", partial: "bg-missing", unsupported: "bg-muted/40" } as const;
  const checked = STORES.filter((s) => s.support !== "unsupported").length;
  return (
    <Link href="/stores" className={`${tile} col-span-2 block hover:border-foreground/30`}>
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">Stores</div>
        <div className="text-xs text-muted">{checked} checked automatically</div>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {STORES.map((s) => (
          <li key={s.id} className="flex items-center gap-2 truncate">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot[s.support]}`} />
            <span className={s.support === "unsupported" ? "text-muted" : ""}>{s.name}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}

function HowTile() {
  return (
    <div id="how-it-works" className={`${tile} col-span-2 scroll-mt-16 md:col-span-4`}>
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">How it works</div>
      <ol className="mt-3 grid gap-4 md:grid-cols-3">
        {[
          ["Import", "Paste a list from Moxfield, ManaBox or Arena, or search cards one by one."],
          ["Mark", "Tap the cards you already own. Everything else is what you still need."],
          [
            "Shop",
            "We check local stores for missing cards only, cached for 12 hours, and show the cheapest copy per card.",
          ],
        ].map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sun/15 text-sm font-semibold text-sun">
              {i + 1}
            </span>
            <div>
              <div className="font-medium">{title}</div>
              <p className="text-sm text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SignedOutTile() {
  return (
    <div
      className={`col-span-2 flex min-h-56 flex-col justify-end rounded-3xl bg-foreground p-5 text-background md:col-span-4 md:min-h-0 md:flex-row md:items-center md:justify-between md:gap-6`}
    >
      <div>
        <SunMark size={32} className="mb-4 text-sun md:hidden" />
        <div className="font-display text-3xl font-semibold leading-tight">Your decks, on every device</div>
        <p className="mt-1 max-w-xl text-sm opacity-75">
          Create a free account to save your decks, track what you own, and price the rest at PH stores.
        </p>
      </div>
      <div className="mt-5 flex shrink-0 flex-wrap gap-2 md:mt-0">
        <Link
          href="/signup"
          className="inline-flex h-11 items-center rounded-full bg-sun px-5 font-medium text-black hover:opacity-90"
        >
          Create account
        </Link>
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-full border border-background/30 px-5 font-medium hover:border-background/60"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
