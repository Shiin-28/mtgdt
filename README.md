# MTGDT — MTG Deck Tracker

**Build it. Own it. Find the rest.**

MTGDT is a Commander deck tracker for Magic: The Gathering players in the
Philippines. Import a decklist, mark the cards you already own (or will proxy),
and see the cheapest in-stock copy of everything else across local game stores,
priced in pesos.

## Features

**Decks**
- Create, rename and delete decks; pick a format (Commander, Pauper Commander,
  Duel Commander, Brawl, Oathbreaker, Other).
- Add cards by search, or paste a whole list: plain names, `1 Sol Ring`, and
  Moxfield / ManaBox / Arena exports with set codes and collector numbers.
  Duplicate lines merge; section headers like "Sideboard" are skipped; cards
  under "Commander" become your commander.
- **Partner and Background commanders.** If your commander has Partner,
  Partner with…, Partner—Friends forever (or another Partner group), Choose a
  Background or Doctor's companion, MTGDT suggests only legal second commanders
  and warns about illegal pairs.

**Owned / proxy / missing**
- Tap a card to cycle **Missing → Owned → Proxy**. Proxied cards are never priced
  or added to your shopping list, and you can copy a proxy list for printing.
- Progress bar and filters (All / Owned / Proxy / Missing) count copies, so
  8 Islands count as 8.

**Prices from Philippine stores**
- Cheapest in-stock listing per missing card: store, condition, foil, stock,
  link and when it was checked. Expand a card to see every store's listing.
- Cost to complete the deck, and a **shopping list grouped by store** with subtotals.
- Options to prefer nonfoil and to ignore heavily played / damaged copies.
- Results stream in as each store answers; you can stop a check and resume later.
- **Full scan:** one click copies your missing list and opens
  [TCGph](https://tcgph.com) Multisearch, which covers every PH store.

**Views**
- List, Condensed, Detailed, Grid, Stacks, Stacks (split) and Spoiler views.
- Group by type, mana value, color or status; sort by name, mana value or price.
- Card inspector: hover to preview, click to edit status, copies and listings.
- Official mana symbols, light and dark mode, works on phones.

**Accounts (optional)**
- Sign up, log in, password reset and a profile menu, via [Supabase](https://supabase.com).
- Each user only sees their own decks; every page, action and API checks ownership
  on the server. Without Supabase settings the app runs in single-user mode.

## Stores

| Store | Status |
|---|---|
| Green Gate Hobbies, Staxx Cards & Hobbies, DM Collectibles | Checked automatically |
| Block 101 Hobbies | Checked via the store's published product sitemap |
| Jace Collection, Vault Card Shop | Checked; listings whose price only appears in the browser link to the store |
| High Market Online, Cardpro, Infinity Hobbies, TriCS Circle of Hobbies | Not checked (bot checks or robots.txt); "check on store" links instead |

MTGDT fetches politely: only cards you're missing, at most one request every
1.5 seconds per store, results cached for 12 hours, robots.txt respected, and a
clear `MTGDeckTracker` user agent. It backs off after errors or "slow down"
responses. See [STORES.md](STORES.md) for how each store was researched.

## Getting started

**You need** Node.js 20 or newer (developed on Node 24) and npm.

```bash
git clone https://github.com/Shiin-28/mtgdt.git
cd mtgdt
npm install                 # also generates the Prisma client
cp .env.example .env        # then edit .env (see below)
npx prisma migrate dev      # creates the local SQLite database
npm run dev                 # http://localhost:3000
```

npm may ask you to approve install scripts for Prisma, better-sqlite3 and
esbuild; they're listed under `allowScripts` in `package.json`.

### Environment variables

| Variable | Needed | What it is |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite file, e.g. `file:./prisma/dev.db` |
| `NEXT_PUBLIC_SUPABASE_URL` | For accounts | Your Supabase Project URL, e.g. `https://abcd.supabase.co` (no `/rest/v1` at the end) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For accounts | Supabase publishable key (`sb_publishable_…`) or legacy anon key |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public address of the site, used in confirmation and reset emails |

Never put the Supabase **secret** / `service_role` key in this app.

### Turning on accounts (Supabase)

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard)
   (Southeast Asia / Singapore is closest to the Philippines).
2. **Project Settings → API Keys:** copy the publishable key. The Project URL is
   `https://<project-id>.supabase.co` (the ID is in the dashboard address bar).
3. Put both in `.env`.
4. **Authentication → URL Configuration:** Site URL `http://localhost:3000`, and add
   `http://localhost:3000/auth/callback` to Redirect URLs.
5. Restart `npm run dev` (delete `.next` first if old settings stick).

No database tables are needed in Supabase; it only handles logins. Decks made
before accounts were switched on are claimed by the first account that logs in.
Supabase's built-in email sends only a few messages per hour; for real users,
configure your own SMTP under **Authentication → Emails**.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Unit tests (Vitest): decklist parser, name matching, condition/foil parsing, robots.txt, pricing, grouping, commander pairing |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations |

## Tech stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 ·
Prisma 7 with SQLite · Supabase Auth · Scryfall API · Vitest

## Project layout

```
src/
  app/                  pages, server actions and API routes
    api/decks/[id]/prices   streams store prices as they arrive (NDJSON)
    auth/               sign-in actions and the email link handler
  components/           deck editor, views, price panels, auth UI
  lib/
    scryfall/           Scryfall client (rate-limited, cached) and card resolution
    stores/             one adapter per store, polite fetcher, robots.txt, matching
    prices/             price cache, cheapest-copy planning, shopping list
    cards/              name normalizing, grouping, status, commander pairing
    decklist/           decklist parser
  proxy.ts              keeps the login session fresh, guards private pages
prisma/                 schema and migrations
STORES.md               research notes on each store
```

## Known limitations

- **Data is stored in a local SQLite file.** Deploying to a serverless host such as
  Vercel needs a hosted database (e.g. Supabase Postgres) first.
- A full price check of a 100-card deck can take several minutes, because each
  store gets one request every 1.5 seconds. Results are cached for 12 hours.
- Block 101 is searched through its sitemap, so only the first few printings of a
  card are checked; its index takes about 6 minutes to build on first use.
- Some stores can't be checked automatically (see the table above). TCGph's full
  scan covers them.

## Credits

- Card data, images and mana symbols from [Scryfall](https://scryfall.com).
- Price comparison across PH stores also available on [TCGph](https://tcgph.com).

MTGDT is unofficial Fan Content permitted under the Fan Content Policy. Not
approved/endorsed by Wizards. Portions of the materials used are property of
Wizards of the Coast. ©Wizards of the Coast LLC.
