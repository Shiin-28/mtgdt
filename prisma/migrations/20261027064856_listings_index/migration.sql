-- CreateTable
CREATE TABLE "StoreIndexEntry" (
    "url" TEXT NOT NULL PRIMARY KEY,
    "store" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "setCode" TEXT,
    "collectorNumber" TEXT,
    "foil" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "StoreIndexState" (
    "store" TEXT NOT NULL PRIMARY KEY,
    "builtAt" DATETIME NOT NULL,
    "entries" INTEGER NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "store" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "setCode" TEXT,
    "collectorNumber" TEXT,
    "condition" TEXT NOT NULL,
    "foil" BOOLEAN NOT NULL,
    "pricePhp" REAL,
    "quantity" INTEGER,
    "inStock" BOOLEAN NOT NULL,
    "url" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoreListing" ("cardKey", "cardName", "collectorNumber", "condition", "fetchedAt", "foil", "id", "inStock", "pricePhp", "quantity", "setCode", "store", "url") SELECT "cardKey", "cardName", "collectorNumber", "condition", "fetchedAt", "foil", "id", "inStock", "pricePhp", "quantity", "setCode", "store", "url" FROM "StoreListing";
DROP TABLE "StoreListing";
ALTER TABLE "new_StoreListing" RENAME TO "StoreListing";
CREATE INDEX "StoreListing_store_cardKey_idx" ON "StoreListing"("store", "cardKey");
CREATE INDEX "StoreListing_cardKey_idx" ON "StoreListing"("cardKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StoreIndexEntry_store_nameKey_idx" ON "StoreIndexEntry"("store", "nameKey");
