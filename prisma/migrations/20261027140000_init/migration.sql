-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
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
    "cmc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "colorIdentity" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "keywords" TEXT,
    "partnerWith" TEXT,
    "partnerGroup" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'commander',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "ownedQty" INTEGER NOT NULL DEFAULT 0,
    "proxy" BOOLEAN NOT NULL DEFAULT false,
    "isCommander" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreListing" (
    "id" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "setCode" TEXT,
    "collectorNumber" TEXT,
    "condition" TEXT NOT NULL,
    "foil" BOOLEAN NOT NULL,
    "pricePhp" DOUBLE PRECISION,
    "quantity" INTEGER,
    "inStock" BOOLEAN NOT NULL,
    "url" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreFetch" (
    "store" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreFetch_pkey" PRIMARY KEY ("store","cardKey")
);

-- CreateTable
CREATE TABLE "StoreIndexEntry" (
    "url" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "setCode" TEXT,
    "collectorNumber" TEXT,
    "foil" BOOLEAN NOT NULL,

    CONSTRAINT "StoreIndexEntry_pkey" PRIMARY KEY ("url")
);

-- CreateTable
CREATE TABLE "StoreIndexState" (
    "store" TEXT NOT NULL,
    "builtAt" TIMESTAMP(3) NOT NULL,
    "entries" INTEGER NOT NULL,

    CONSTRAINT "StoreIndexState_pkey" PRIMARY KEY ("store")
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
CREATE INDEX "Deck_userId_idx" ON "Deck"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeckCard_deckId_cardId_key" ON "DeckCard"("deckId", "cardId");

-- CreateIndex
CREATE INDEX "StoreListing_store_cardKey_idx" ON "StoreListing"("store", "cardKey");

-- CreateIndex
CREATE INDEX "StoreListing_cardKey_idx" ON "StoreListing"("cardKey");

-- CreateIndex
CREATE INDEX "StoreIndexEntry_store_nameKey_idx" ON "StoreIndexEntry"("store", "nameKey");

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

