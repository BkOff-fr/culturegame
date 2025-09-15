import { PowerUpType, GameMode, MessageType, FriendshipStatus } from '@prisma/client';

// Power-ups types
export interface PowerUpEffect {
  type: PowerUpType;
  duration?: number;
  value?: number;
}

export interface UsePowerUpRequest {
  powerUpId: string;
  questionId: string;
}

export interface PowerUpInventory {
  powerUpId: string;
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
  quantity: number;
}

// Game modes types
export interface SurvivalGameSettings {
  lives: number;
  livesPenalty: number;
}

export interface DuelGameSettings {
  eloAtStake: number;
  timeLimit: number;
}

export interface MarathonGameSettings {
  difficultyProgression: boolean;
  infiniteQuestions: boolean;
}

export interface TeamGameSettings {
  teamSize: number;
  sharedScore: boolean;
}

export interface DailyChallengeSettings {
  questionCount: number;
  timeLimit: number;
}

// Profile types
export interface AvatarData {
  shape: string;
  color: string;
  accessories: string[];
  background: string;
}

export interface UserProfileData {
  avatar: AvatarData;
  banner?: string;
  title?: string;
  theme: string;
  coins: number;
  experience: number;
  level: number;
  eloRating: number;
}

// Social types
export interface Friend {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  status: FriendshipStatus;
}

export interface GameInvite {
  id: string;
  fromUser: string;
  gameId: string;
  roomCode: string;
  gameMode: GameMode;
}

// Chat types
export interface ChatMessageData {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  message: string;
  type: MessageType;
  createdAt: Date;
}

export const PREDEFINED_MESSAGES = [
  "Bien joué!",
  "Trop fort!",
  "Nice!",
  "Impressionnant!",
  "😮",
  "💪",
  "🔥",
  "👏",
  "Allez!",
  "On y est presque!"
] as const;

// Game replay types
export interface GameReplayData {
  gameId: string;
  players: {
    id: string;
    username: string;
    finalScore: number;
  }[];
  questions: {
    id: string;
    question: string;
    answers: {
      playerId: string;
      answer: any;
      isCorrect: boolean;
      timeSpent: number;
    }[];
  }[];
  powerUpUsages: {
    playerId: string;
    powerUpType: PowerUpType;
    questionId: string;
    usedAt: Date;
  }[];
  gameMode: GameMode;
  duration: number;
  createdAt: Date;
}

// Review types
export interface ReviewQuestion {
  id: string;
  question: string;
  type: string;
  data: any;
  category: string;
  difficulty: string;
  userAnswer: any;
  correctAnswer: any;
  timesWrong: number;
  lastAttempt: Date;
}

export interface ReviewSession {
  id: string;
  questions: ReviewQuestion[];
  progress: {
    current: number;
    total: number;
    correct: number;
    mastered: number;
  };
}

// Daily Challenge types
export interface DailyChallengeData {
  id: string;
  date: Date;
  questions: string[];
  isActive: boolean;
  userAttempt?: {
    score: number;
    completedAt: Date;
  };
  leaderboard: {
    rank: number;
    username: string;
    score: number;
  }[];
}

// ELO system types
export interface EloChange {
  before: number;
  after: number;
  change: number;
}

// Achievement types
export interface AchievementProgress {
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  level: number;
  eloRating?: number;
}

export interface Leaderboard {
  category: string;
  period: string;
  entries: LeaderboardEntry[];
  userRank?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket event types
export interface SocketEvents {
  // Game events
  'game:joined': { gameId: string; player: any };
  'game:left': { gameId: string; playerId: string };
  'game:started': { gameId: string };
  'game:question': { gameId: string; question: any };
  'game:answer': { gameId: string; playerId: string; answer: any };
  'game:powerup': { gameId: string; playerId: string; powerUp: PowerUpType };
  'game:ended': { gameId: string; results: any };

  // Chat events
  'chat:message': ChatMessageData;

  // Friend events
  'friend:request': { from: string; username: string };
  'friend:accepted': { friendId: string; username: string };
  'friend:online': { friendId: string };
  'friend:offline': { friendId: string };

  // Notification events
  'notification': { type: string; message: string; data?: any };
}

export type SocketEventKey = keyof SocketEvents;
export type SocketEventData<K extends SocketEventKey> = SocketEvents[K];