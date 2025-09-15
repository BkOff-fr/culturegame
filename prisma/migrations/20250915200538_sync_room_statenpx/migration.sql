/*
  Warnings:

  - A unique constraint covering the columns `[type]` on the table `power_ups` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `power_ups` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "player_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameId" TEXT,
    "socketId" TEXT NOT NULL,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    CONSTRAINT "player_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "player_connections_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_room_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerCount" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "roomData" JSONB,
    CONSTRAINT "game_room_states_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "player_connections_socketId_key" ON "player_connections"("socketId");

-- CreateIndex
CREATE INDEX "player_connections_gameId_userId_idx" ON "player_connections"("gameId", "userId");

-- CreateIndex
CREATE INDEX "player_connections_socketId_idx" ON "player_connections"("socketId");

-- CreateIndex
CREATE INDEX "player_connections_userId_connectedAt_idx" ON "player_connections"("userId", "connectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "game_room_states_gameId_key" ON "game_room_states"("gameId");

-- CreateIndex
CREATE INDEX "game_room_states_lastActivity_idx" ON "game_room_states"("lastActivity");

-- CreateIndex
CREATE INDEX "game_room_states_status_lastActivity_idx" ON "game_room_states"("status", "lastActivity");

-- CreateIndex
CREATE INDEX "game_players_gameId_idx" ON "game_players"("gameId");

-- CreateIndex
CREATE INDEX "game_players_userId_idx" ON "game_players"("userId");

-- CreateIndex
CREATE INDEX "game_players_userId_score_idx" ON "game_players"("userId", "score");

-- CreateIndex
CREATE INDEX "game_questions_gameId_order_idx" ON "game_questions"("gameId", "order");

-- CreateIndex
CREATE INDEX "games_status_createdAt_idx" ON "games"("status", "createdAt");

-- CreateIndex
CREATE INDEX "games_hostId_idx" ON "games"("hostId");

-- CreateIndex
CREATE INDEX "games_roomCode_idx" ON "games"("roomCode");

-- CreateIndex
CREATE INDEX "games_roomCode_status_idx" ON "games"("roomCode", "status");

-- CreateIndex
CREATE INDEX "games_hostId_status_idx" ON "games"("hostId", "status");

-- CreateIndex
CREATE INDEX "leaderboards_category_period_rank_idx" ON "leaderboards"("category", "period", "rank");

-- CreateIndex
CREATE INDEX "leaderboards_userId_category_idx" ON "leaderboards"("userId", "category");

-- CreateIndex
CREATE INDEX "player_answers_gamePlayerId_idx" ON "player_answers"("gamePlayerId");

-- CreateIndex
CREATE INDEX "player_answers_isCorrect_pointsEarned_idx" ON "player_answers"("isCorrect", "pointsEarned");

-- CreateIndex
CREATE UNIQUE INDEX "power_ups_type_key" ON "power_ups"("type");

-- CreateIndex
CREATE UNIQUE INDEX "power_ups_name_key" ON "power_ups"("name");

-- CreateIndex
CREATE INDEX "questions_category_difficulty_idx" ON "questions"("category", "difficulty");

-- CreateIndex
CREATE INDEX "questions_isPublic_category_idx" ON "questions"("isPublic", "category");

-- CreateIndex
CREATE INDEX "questions_createdById_idx" ON "questions"("createdById");
