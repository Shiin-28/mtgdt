import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SunMark } from "@/components/SunMark";
import { getHeroCard } from "@/lib/hero";
import { manaSymbolUrl } from "@/lib/manaSymbols";
import { authEnabled } from "@/lib/supabase/config";

const PERKS = [
  ["Every deck in one place", "Import from Moxfield, ManaBox or Arena in one paste."],
  ["Know what you own", "Tap cards as owned or proxy; the rest is your shopping list."],
  ["Cheapest PH copies", "Prices from local game stores, grouped by store."],
] as const;

/**
 * Log in / sign up / password pages: a visual panel beside the form card.
 * `tab` shows the Log in | Create account switch on those two pages.
 */
export function AuthCard({
  title,
  sub,
  tab,
  next = "/decks",
  children,
}: {
  title: string;
  sub?: string;
  tab?: "login" | "signup";
  next?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-12">
        <VisualPanel />

        <div className="flex flex-col justify-center">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl shadow-black/5 sm:p-8">
            {tab && (
              <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-sm">
                {(
                  [
                    ["login", "Log in", "/login"],
                    ["signup", "Create account", "/signup"],
                  ] as const
                ).map(([key, label, href]) => (
                  <Link
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    href={`${href}?next=${encodeURIComponent(next)}`}
                    className={`flex h-10 items-center justify-center rounded-full font-medium transition ${
                      tab === key ? "bg-surface shadow-sm" : "text-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
            <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
            {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
            <div className="mt-6">{authEnabled ? children : <SetupSteps />}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function VisualPanel() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-[#0f1530] p-6 text-white sm:p-8 lg:p-10">
      {/* Sun glow and rays */}
      <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-[#f5c542]/25 blur-3xl" />
      <SunMark size={420} className="absolute -right-28 -top-28 -z-10 text-[#f5c542]/10" />
      <div className="absolute -bottom-32 -left-20 -z-10 h-72 w-72 rounded-full bg-[#3b5bdb]/30 blur-3xl" />

      <div className="flex items-center gap-1.5">
        {["W", "U", "B", "R", "G"].map((c) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={c}
            src={manaSymbolUrl(c)}
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] rounded-full shadow"
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <h2 className="font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-semibold leading-[1.05] tracking-tight">
            <span className="whitespace-nowrap">Build it. Own it.</span>
            <br />
            <span className="whitespace-nowrap text-[#f5c542]">Find the rest.</span>
          </h2>
          <ul className="mt-6 hidden space-y-4 sm:block">
            {PERKS.map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5c542] text-xs font-bold text-black">
                  ✓
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm text-white/65">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Suspense fallback={<div className="hidden h-64 w-44 rounded-xl bg-white/10 sm:block" />}>
          <DailyCard />
        </Suspense>
      </div>
    </section>
  );
}

async function DailyCard() {
  const card = await getHeroCard();
  if (!card) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={card.imageUrl}
      alt={card.cardName}
      title={`Today's commander: ${card.cardName}`}
      className="hidden w-44 rotate-6 rounded-[4.75%/3.5%] shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:block lg:w-52"
    />
  );
}

/** Shown instead of the form until Supabase settings are added. */
function SetupSteps() {
  const steps: [string, React.ReactNode][] = [
    [
      "Create a free Supabase project",
      <>
        At{" "}
        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">
          supabase.com/dashboard
        </a>{" "}
        (Singapore region is closest to PH).
      </>,
    ],
    ["Copy two values", "Project Settings → API: the Project URL and the publishable (anon) key."],
    [
      "Add them to .env",
      <code key="env" className="mt-1 block overflow-x-auto rounded-lg bg-background p-2 text-xs leading-relaxed">
        NEXT_PUBLIC_SUPABASE_URL=&quot;https://…supabase.co&quot;
        <br />
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=&quot;sb_publishable_…&quot;
      </code>,
    ],
    ["Restart the app", "Then this page becomes your log in and sign up."],
  ];
  return (
    <div>
      <p className="mb-4 rounded-xl bg-sun/10 px-3 py-2 text-sm">
        <span className="font-medium">Accounts aren&rsquo;t switched on yet.</span>{" "}
        <span className="text-muted">MTGDT works without them in single-user mode.</span>
      </p>
      <ol className="space-y-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
              {i + 1}
            </span>
            <div className="min-w-0 text-sm">
              <div className="font-medium">{title}</div>
              <div className="text-muted">{body}</div>
            </div>
          </li>
        ))}
      </ol>
      <Link
        href="/decks"
        className="mt-6 flex h-11 items-center justify-center rounded-full border border-border font-medium hover:border-foreground/40"
      >
        Keep using single-user mode
      </Link>
    </div>
  );
}
