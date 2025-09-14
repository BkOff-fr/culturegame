import { GameMode, Difficulty } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface GameModeConfig {
  name: string;
  description: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  defaultSettings: any;
}

export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  [GameMode.CLASSIC]: {
    name: 'Classique',
    description: 'Mode de jeu standard',
    icon: '🎮',
    minPlayers: 1,
    maxPlayers: 8,
    defaultSettings: {
      timeLimit: 30,
      questionCount: 10,
      categories: ['all']
    }
  },
  [GameMode.SURVIVAL]: {
    name: 'Survie',
    description: '3 vies, perdez-en une par mauvaise réponse',
    icon: '💀',
    minPlayers: 1,
    maxPlayers: 6,
    defaultSettings: {
      lives: 3,
      timeLimit: 25,
      livesPenalty: 1,
      questionCount: -1 // Unlimited until all lives lost
    }
  },
  [GameMode.DUEL]: {
    name: 'Duel',
    description: 'Affrontement 1v1 en temps réel',
    icon: '⚔️',
    minPlayers: 2,
    maxPlayers: 2,
    defaultSettings: {
      timeLimit: 20,
      questionCount: 5,
      eloAtStake: 25,
      simultaneousQuestions: true
    }
  },
  [GameMode.MARATHON]: {
    name: 'Marathon',
    description: 'Questions infinies, difficulté progressive',
    icon: '🏃',
    minPlayers: 1,
    maxPlayers: 4,
    defaultSettings: {
      timeLimit: 30,
      difficultyProgression: true,
      pointsMultiplier: 1.5,
      questionCount: -1 // Unlimited
    }
  },
  [GameMode.TEAM]: {
    name: 'Équipe',
    description: 'Mode équipe 2v2 ou 3v3',
    icon: '👥',
    minPlayers: 4,
    maxPlayers: 6,
    defaultSettings: {
      timeLimit: 25,
      questionCount: 12,
      teamSize: 2,
      sharedScore: true,
      teamDiscussion: 15 // seconds for team to discuss
    }
  },
  [GameMode.DAILY]: {
    name: 'Défi Quotidien',
    description: 'Même questions pour tous, classement journalier',
    icon: '📅',
    minPlayers: 1,
    maxPlayers: 1,
    defaultSettings: {
      timeLimit: 30,
      questionCount: 10,
      fixedQuestions: true,
      leaderboard: true
    }
  }
};

export class GameModeManager {
  // Survival Mode Logic
  static async processSurvivalAnswer(
    gameId: string,
    playerId: string,
    isCorrect: boolean,
    currentLives: number
  ): Promise<{ lives: number; eliminated: boolean }> {
    if (!isCorrect) {
      const newLives = Math.max(0, currentLives - 1);
      const eliminated = newLives === 0;

      // Update player lives in database
      await prisma.gamePlayer.update({
        where: { id: playerId },
        data: {
          // Store lives in a JSON field or add lives column
          lives: newLives
        }
      });

      return { lives: newLives, eliminated };
    }

    return { lives: currentLives, eliminated: false };
  }

  // Marathon Mode Logic
  static getMarathonDifficulty(questionNumber: number): Difficulty {
    if (questionNumber <= 5) return Difficulty.EASY;
    if (questionNumber <= 10) return Difficulty.MEDIUM;
    if (questionNumber <= 20) return Difficulty.HARD;
    return Difficulty.EXPERT;
  }

  static calculateMarathonScore(
    baseScore: number,
    questionNumber: number,
    timeSpent: number,
    timeLimit: number
  ): number {
    // Progressive multiplier
    const difficultyMultiplier = Math.floor(questionNumber / 5) * 0.25 + 1;

    // Time bonus (faster = more points)
    const timeBonus = Math.max(0, (timeLimit - timeSpent) / timeLimit) * 0.5 + 1;

    return Math.floor(baseScore * difficultyMultiplier * timeBonus);
  }

  // Duel Mode Logic
  static async processDuelResult(
    player1Id: string,
    player2Id: string,
    player1Score: number,
    player2Score: number
  ): Promise<{ player1EloChange: number; player2EloChange: number }> {
    // Get current ELO ratings
    const [player1Profile, player2Profile] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: player1Id } }),
      prisma.userProfile.findUnique({ where: { userId: player2Id } })
    ]);

    const player1Elo = player1Profile?.eloRating || 1200;
    const player2Elo = player2Profile?.eloRating || 1200;

    // Calculate ELO changes
    const eloChanges = this.calculateEloChange(
      player1Elo,
      player2Elo,
      player1Score > player2Score ? 1 : player1Score < player2Score ? 0 : 0.5
    );

    // Update ELO ratings
    await Promise.all([
      prisma.userProfile.update({
        where: { userId: player1Id },
        data: { eloRating: { increment: eloChanges.player1Change } }
      }),
      prisma.userProfile.update({
        where: { userId: player2Id },
        data: { eloRating: { increment: eloChanges.player2Change } }
      })
    ]);

    return {
      player1EloChange: eloChanges.player1Change,
      player2EloChange: eloChanges.player2Change
    };
  }

  private static calculateEloChange(
    player1Rating: number,
    player2Rating: number,
    score: number // 1 = player1 wins, 0 = player2 wins, 0.5 = draw
  ): { player1Change: number; player2Change: number } {
    const K = 32; // K-factor

    const expectedScore1 = 1 / (1 + Math.pow(10, (player2Rating - player1Rating) / 400));
    const expectedScore2 = 1 - expectedScore1;

    const player1Change = Math.round(K * (score - expectedScore1));
    const player2Change = Math.round(K * ((1 - score) - expectedScore2));

    return { player1Change, player2Change };
  }

  // Team Mode Logic
  static async processTeamAnswer(
    gameId: string,
    teamId: string,
    isCorrect: boolean,
    pointsEarned: number
  ): Promise<void> {
    // Get all players in the team
    const teamPlayers = await prisma.gamePlayer.findMany({
      where: {
        gameId,
        teamId
      }
    });

    // Update all team members' scores
    await Promise.all(
      teamPlayers.map(player =>
        prisma.gamePlayer.update({
          where: { id: player.id },
          data: { score: { increment: pointsEarned } }
        })
      )
    );
  }

  // Daily Challenge Logic
  static async createDailyChallenge(): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if today's challenge already exists
    const existingChallenge = await prisma.dailyChallenge.findUnique({
      where: { date: today }
    });

    if (existingChallenge) {
      return existingChallenge.id;
    }

    // Select 10 random questions
    const questions = await prisma.question.findMany({
      where: { isPublic: true },
      take: 10,
      skip: Math.floor(Math.random() * 100), // Random starting point
      select: { id: true }
    });

    // Create new challenge
    const challenge = await prisma.dailyChallenge.create({
      data: {
        date: today,
        questions: questions.map(q => q.id),
        isActive: true
      }
    });

    return challenge.id;
  }

  static async submitDailyChallengeScore(
    challengeId: string,
    userId: string,
    score: number,
    answers: any[]
  ): Promise<{ rank: number; totalParticipants: number }> {
    // Record the attempt
    await prisma.dailyChallengeAttempt.upsert({
      where: {
        challengeId_userId: {
          challengeId,
          userId
        }
      },
      update: {
        score,
        answers,
        completedAt: new Date()
      },
      create: {
        challengeId,
        userId,
        score,
        answers,
        completedAt: new Date()
      }
    });

    // Calculate rank
    const attempts = await prisma.dailyChallengeAttempt.findMany({
      where: { challengeId },
      orderBy: { score: 'desc' }
    });

    const rank = attempts.findIndex(attempt => attempt.userId === userId) + 1;

    return {
      rank,
      totalParticipants: attempts.length
    };
  }

  // General helper methods
  static validateGameMode(mode: GameMode, playerCount: number): boolean {
    const config = GAME_MODE_CONFIGS[mode];
    return playerCount >= config.minPlayers && playerCount <= config.maxPlayers;
  }

  static getRecommendedQuestions(
    mode: GameMode,
    difficulty?: Difficulty,
    category?: string
  ): Promise<any[]> {
    const config = GAME_MODE_CONFIGS[mode];

    let whereCondition: any = { isPublic: true };

    if (difficulty) {
      whereCondition.difficulty = difficulty;
    }

    if (category && category !== 'all') {
      whereCondition.category = category;
    }

    return prisma.question.findMany({
      where: whereCondition,
      take: config.defaultSettings.questionCount > 0 ? config.defaultSettings.questionCount : 50,
      orderBy: { createdAt: 'desc' }
    });
  }

  // Game state management
  static async updateGameState(
    gameId: string,
    state: any
  ): Promise<void> {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        settings: state
      }
    });
  }

  static async endGameMode(
    gameId: string,
    mode: GameMode,
    results: any
  ): Promise<void> {
    // Process end-game logic specific to each mode
    switch (mode) {
      case GameMode.DUEL:
        // Handle ELO rating changes
        break;

      case GameMode.MARATHON:
        // Record marathon achievements
        break;

      case GameMode.SURVIVAL:
        // Record survival statistics
        break;

      case GameMode.TEAM:
        // Process team results
        break;

      case GameMode.DAILY:
        // Update daily leaderboard
        break;
    }

    // Mark game as finished
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: 'FINISHED',
        endedAt: new Date()
      }
    });
  }
}