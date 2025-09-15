-- CreateTable
CREATE TABLE "micro_challenges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "micro_challenges_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "micro_challenge_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "micro_challenge_responses_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "micro_challenges" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "micro_challenge_responses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "micro_challenges_gameId_status_idx" ON "micro_challenges"("gameId", "status");

-- CreateIndex
CREATE INDEX "micro_challenges_expiresAt_idx" ON "micro_challenges"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "micro_challenge_responses_challengeId_userId_key" ON "micro_challenge_responses"("challengeId", "userId");
