-- AlterTable
ALTER TABLE "Deck" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Deck_userId_idx" ON "Deck"("userId");
