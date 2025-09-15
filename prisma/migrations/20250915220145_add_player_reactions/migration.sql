-- CreateTable
CREATE TABLE "player_reactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "questionId" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "player_reactions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "player_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "player_reactions_gameId_timestamp_idx" ON "player_reactions"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "player_reactions_questionId_timestamp_idx" ON "player_reactions"("questionId", "timestamp");

-- CreateIndex
CREATE INDEX "player_reactions_expiresAt_idx" ON "player_reactions"("expiresAt");
