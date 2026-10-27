-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeckCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "ownedQty" INTEGER NOT NULL DEFAULT 0,
    "proxy" BOOLEAN NOT NULL DEFAULT false,
    "isCommander" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeckCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DeckCard" ("cardId", "deckId", "id", "isCommander", "ownedQty", "quantity") SELECT "cardId", "deckId", "id", "isCommander", "ownedQty", "quantity" FROM "DeckCard";
DROP TABLE "DeckCard";
ALTER TABLE "new_DeckCard" RENAME TO "DeckCard";
CREATE UNIQUE INDEX "DeckCard_deckId_cardId_key" ON "DeckCard"("deckId", "cardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
