-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "oracleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frontName" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "frontKey" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "collectorNumber" TEXT NOT NULL,
    "imageUrl" TEXT,
    "typeLine" TEXT NOT NULL,
    "manaCost" TEXT,
    "cmc" REAL NOT NULL DEFAULT 0,
    "colorIdentity" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "ownedQty" INTEGER NOT NULL DEFAULT 0,
    "isCommander" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeckCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "store" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "setCode" TEXT,
    "collectorNumber" TEXT,
    "condition" TEXT NOT NULL,
    "foil" BOOLEAN NOT NULL,
    "pricePhp" REAL NOT NULL,
    "quantity" INTEGER,
    "inStock" BOOLEAN NOT NULL,
    "url" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoreFetch" (
    "store" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "fetchedAt" DATETIME NOT NULL,

    PRIMARY KEY ("store", "cardKey")
);

-- CreateIndex
CREATE INDEX "Card_nameKey_idx" ON "Card"("nameKey");

-- CreateIndex
CREATE INDEX "Card_frontKey_idx" ON "Card"("frontKey");

-- CreateIndex
CREATE INDEX "Card_oracleId_idx" ON "Card"("oracleId");

-- CreateIndex
CREATE INDEX "Card_setCode_collectorNumber_idx" ON "Card"("setCode", "collectorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCard_deckId_cardId_key" ON "DeckCard"("deckId", "cardId");

-- CreateIndex
CREATE INDEX "StoreListing_store_cardKey_idx" ON "StoreListing"("store", "cardKey");

-- CreateIndex
CREATE INDEX "StoreListing_cardKey_idx" ON "StoreListing"("cardKey");
