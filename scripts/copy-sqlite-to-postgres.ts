/**
 * One-time copy of the old local SQLite database into Supabase Postgres.
 *
 *   npx tsx --env-file=.env scripts/copy-sqlite-to-postgres.ts [path/to/old.db]
 *
 * Defaults to prisma/backup/dev-before-postgres.db. Safe to run again: rows
 * that already exist are skipped.
 */
import { DatabaseSync } from "node:sqlite";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const file = process.argv[2] ?? "prisma/backup/dev-before-postgres.db";
const sqlite = new DatabaseSync(file, { readOnly: true });
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url || url.includes("[YOUR-PASSWORD]")) {
  console.error("Set DIRECT_URL / DATABASE_URL in .env (with your password) first.");
  process.exit(1);
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

type Row = Record<string, unknown>;
const rows = (table: string) => sqlite.prepare(`SELECT * FROM "${table}"`).all() as Row[];
const date = (v: unknown) => new Date(typeof v === "number" ? v : String(v));
const bool = (v: unknown) => v === 1 || v === true || v === "1";
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

async function insert<T>(label: string, data: T[], write: (chunk: T[]) => Promise<{ count: number }>) {
  let added = 0;
  for (let i = 0; i < data.length; i += 2000) added += (await write(data.slice(i, i + 2000))).count;
  console.log(`${label.padEnd(16)} ${String(data.length).padStart(7)} rows, ${added} added`);
}

async function main() {
  await insert(
    "Card",
    rows("Card").map((r) => ({
      id: String(r.id),
      oracleId: String(r.oracleId),
      name: String(r.name),
      frontName: String(r.frontName),
      nameKey: String(r.nameKey),
      frontKey: String(r.frontKey),
      setCode: String(r.setCode),
      setName: String(r.setName),
      collectorNumber: String(r.collectorNumber),
      imageUrl: str(r.imageUrl),
      typeLine: String(r.typeLine),
      manaCost: str(r.manaCost),
      cmc: Number(r.cmc),
      colorIdentity: String(r.colorIdentity),
      layout: String(r.layout),
      keywords: str(r.keywords),
      partnerWith: str(r.partnerWith),
      partnerGroup: str(r.partnerGroup),
      fetchedAt: date(r.fetchedAt),
    })),
    (data) => db.card.createMany({ data, skipDuplicates: true }),
  );
  await insert(
    "Deck",
    rows("Deck").map((r) => ({
      id: String(r.id),
      name: String(r.name),
      format: String(r.format),
      userId: str(r.userId),
      createdAt: date(r.createdAt),
      updatedAt: date(r.updatedAt),
    })),
    (data) => db.deck.createMany({ data, skipDuplicates: true }),
  );
  await insert(
    "DeckCard",
    rows("DeckCard").map((r) => ({
      id: String(r.id),
      deckId: String(r.deckId),
      cardId: String(r.cardId),
      quantity: Number(r.quantity),
      ownedQty: Number(r.ownedQty),
      proxy: bool(r.proxy),
      isCommander: bool(r.isCommander),
    })),
    (data) => db.deckCard.createMany({ data, skipDuplicates: true }),
  );
  await insert(
    "StoreListing",
    rows("StoreListing").map((r) => ({
      id: String(r.id),
      store: String(r.store),
      cardKey: String(r.cardKey),
      cardName: String(r.cardName),
      setCode: str(r.setCode),
      collectorNumber: str(r.collectorNumber),
      condition: String(r.condition),
      foil: bool(r.foil),
      pricePhp: r.pricePhp === null ? null : Number(r.pricePhp),
      quantity: r.quantity === null ? null : Number(r.quantity),
      inStock: bool(r.inStock),
      url: String(r.url),
      fetchedAt: date(r.fetchedAt),
    })),
    (data) => db.storeListing.createMany({ data, skipDuplicates: true }),
  );
  await insert(
    "StoreFetch",
    rows("StoreFetch").map((r) => ({
      store: String(r.store),
      cardKey: String(r.cardKey),
      status: String(r.status),
      error: str(r.error),
      fetchedAt: date(r.fetchedAt),
    })),
    (data) => db.storeFetch.createMany({ data, skipDuplicates: true }),
  );
  await insert(
    "StoreIndexEntry",
    rows("StoreIndexEntry").map((r) => ({
      url: String(r.url),
      store: String(r.store),
      nameKey: String(r.nameKey),
      setCode: str(r.setCode),
      collectorNumber: str(r.collectorNumber),
      foil: bool(r.foil),
    })),
    (data) => db.storeIndexEntry.createMany({ data, skipDuplicates: true }),
  );
  await insert(
    "StoreIndexState",
    rows("StoreIndexState").map((r) => ({ store: String(r.store), builtAt: date(r.builtAt), entries: Number(r.entries) })),
    (data) => db.storeIndexState.createMany({ data, skipDuplicates: true }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
