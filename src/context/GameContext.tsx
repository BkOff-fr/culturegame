'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Types pour le contexte Game (REST API only)
interface GameState {
  id: string;
  roomCode: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'QUESTION_ACTIVE' | 'RESULTS_DISPLAY' | 'TRANSITION' | 'FINISHED' | 'PAUSED';
  mode: 'SINGLE' | 'MULTIPLAYER' | 'TEAM' | 'TOURNAMENT';
  settings: any;
  currentQuestionIndex: number;
  questionState?: 'ACTIVE' | 'WAITING_RESULTS' | 'SHOWING_RESULTS' | 'TRANSITIONING';
  resultsDisplayUntil?: Date;
  allPlayersAnswered?: boolean;
  players: Array<{
    id: string;
    user: {
      id: string;
      username: string;
      avatar?: string;
    };
    score: number;
    streak: number;
    position?: number;
    teamId?: string;
    hasAnswered?: boolean;
  }>;
  lives?: number;
  teamA?: string[];
  teamB?: string[];
  startedAt?: Date;
  endedAt?: Date;
  host: {
    id: string;
    username: string;
  };
}

interface CurrentQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: any;
  timeLimit: number;
  points: number;
  category?: string;
  imageUrl?: string;
}

interface QuestionResult {
  questionId: string;
  results: Array<{
    playerId: string;
    username: string;
    answer: any;
    correct: boolean;
    points: number;
    timeSpent: number;
  }>;
}

interface ChatMessageData {
  id: string;
  userId: string;
  username: string;
  message: string;
  type: 'PREDEFINED' | 'CUSTOM';
  timestamp: number;
  createdAt: Date;
}

interface PlayerReactionData {
  id: string;
  reaction: string;
  user: {
    id: string;
    username: string;
    avatar: string;
  };
  timestamp: Date;
  questionId?: string;
}

interface MicroChallengeData {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  expiresAt: Date;
  responses: Array<{
    user: {
      id: string;
      username: string;
      avatar: string;
    };
    response: string;
    submittedAt: Date;
  }>;
}

interface GameContextType {
  gameState: GameState | null;
  currentQuestion: CurrentQuestion | null;
  questionResults: QuestionResult[] | null;
  messages: ChatMessageData[];
  reactions: PlayerReactionData[];
  microChallenge: MicroChallengeData | null;
  isHost: boolean;
  loading: boolean;
  error: string | null;
  currentQuestionNumber: number;
  showingResults: boolean;
  currentQuestionResults: any[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastSyncTime: Date | null;
  syncHealth: 'healthy' | 'degraded' | 'critical';

  // Actions
  joinGame: (roomCode: string) => Promise<boolean>;
  leaveGame: (roomCode: string) => Promise<void>;
  markReady: (roomCode: string) => Promise<void>;
  startGame: (roomCode: string) => Promise<void>;
  submitAnswer: (roomCode: string, questionId: string, answer: any, timeSpent: number) => Promise<void>;
  sendMessage: (roomCode: string, message: string, type?: 'PREDEFINED' | 'CUSTOM') => Promise<void>;
  refreshGameState: () => Promise<void>;
  recoverGame: () => Promise<void>;
  nextQuestion: (roomCode: string) => Promise<void>;
  sendReaction: (roomCode: string, reaction: string, questionId?: string) => Promise<void>;
  createMicroChallenge: (roomCode: string) => Promise<void>;
  respondToMicroChallenge: (roomCode: string, challengeId: string, response: string) => Promise<void>;
  forceSyncNow: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[] | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [reactions, setReactions] = useState<PlayerReactionData[]>([]);
  const [microChallenge, setMicroChallenge] = useState<MicroChallengeData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [showingResults, setShowingResults] = useState(false);
  const [currentQuestionResults, setCurrentQuestionResults] = useState<any[]>([]);

  // Synchronization health monitoring
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncHealth, setSyncHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [failedSyncCount, setFailedSyncCount] = useState(0);
  const [syncTimeouts, setSyncTimeouts] = useState(0);

  const { user } = useAuth();

  // Fonction utilitaire pour les appels API
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(endpoint, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, []);

  // Rejoindre un jeu
  const joinGame = useCallback(async (roomCode: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('/api/games/join', {
        method: 'POST',
        body: JSON.stringify({ roomCode }),
      });

      if (data.game) {
        setGameState(data.game);
        setIsHost(!!(data.game?.hostId && user?.id && data.game.hostId === user.id));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error joining game:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, apiCall]);

  // Quitter un jeu
  const leaveGame = useCallback(async (roomCode: string) => {
    setLoading(true);
    setError(null);

    try {
      await apiCall('/api/games/leave', {
        method: 'POST',
        body: JSON.stringify({ roomCode }),
      });

      setGameState(null);
      setCurrentQuestion(null);
      setQuestionResults(null);
      setMessages([]);
      setIsHost(false);
      setCurrentQuestionNumber(1);
    } catch (err) {
      console.error('Error leaving game:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Marquer comme prêt
  const markReady = useCallback(async (roomCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('/api/games/ready', {
        method: 'POST',
        body: JSON.stringify({ roomCode }),
      });

      if (data.game) {
        setGameState(data.game);
      }
    } catch (err) {
      console.error('Error marking ready:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Démarrer le jeu
  const startGame = useCallback(async (roomCode: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!gameState?.id) throw new Error('No game id');
      const data = await apiCall(`/api/games/${gameState.id}/start`, {
        method: 'POST',
      });

      if (data.game) {
        setGameState(data.game);
      }
      if (data.question) {
        setCurrentQuestion(data.question);
        setCurrentQuestionNumber(1);
      }
    } catch (err) {
      console.error('Error starting game:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall, gameState?.id]);

  // Soumettre une réponse
  const submitAnswer = useCallback(async (roomCode: string, questionId: string, answer: any, timeSpent: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('/api/games/answer', {
        method: 'POST',
        body: JSON.stringify({ roomCode, questionId, answer, timeSpent }),
      });

      if (data.nextQuestion) {
        // Mode solo : progression immédiate
        setCurrentQuestion(data.nextQuestion);
        setCurrentQuestionNumber(prev => prev + 1);
        setShowingResults(false);
        setCurrentQuestionResults([]);
      } else if (data.results) {
        // Fin de jeu
        setQuestionResults(data.results);
      } else if (data.allPlayersAnswered && data.questionResults) {
        // Mode multijoueur : tous les joueurs ont répondu, montrer les résultats
        setShowingResults(true);
        setCurrentQuestionResults(data.questionResults);
      } else if (data.waiting) {
        // En attente des autres joueurs
        setShowingResults(false);
      }

      if (data.game) {
        setGameState(data.game);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Envoyer un message
  const sendMessage = useCallback(async (roomCode: string, message: string, type: 'PREDEFINED' | 'CUSTOM' = 'CUSTOM') => {
    try {
      const data = await apiCall('/api/games/message', {
        method: 'POST',
        body: JSON.stringify({ roomCode, message, type }),
      });

      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [apiCall]);

  // Rafraîchir l'état du jeu avec surveillance de la santé
  const refreshGameState = useCallback(async () => {
    if (!gameState?.roomCode) return;

    const syncStartTime = Date.now();
    setConnectionStatus('connecting');

    try {
      const params = new URLSearchParams({ roomCode: gameState.roomCode });

      // Timeout pour les requêtes
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sync timeout')), 8000)
      );

      // Récupérer l'état du jeu, les réactions et les micro-défis en parallèle
      const syncPromises = Promise.all([
        apiCall(`/api/games/status?${params.toString()}`),
        apiCall(`/api/reactions?${params.toString()}`),
        apiCall(`/api/micro-challenges?${params.toString()}`)
      ]);

      const [gameData, reactionsData, challengeData] = await Promise.race([
        syncPromises,
        timeoutPromise
      ]) as any[];

      // Mise à jour réussie
      const syncDuration = Date.now() - syncStartTime;
      setLastSyncTime(new Date());
      setConnectionStatus('connected');
      setFailedSyncCount(0);
      setSyncTimeouts(0);

      // Évaluer la santé de la synchronisation
      if (syncDuration > 5000) {
        setSyncHealth('degraded');
      } else if (syncDuration > 2000) {
        setSyncHealth('degraded');
      } else {
        setSyncHealth('healthy');
      }

      if (gameData.game) {
        setGameState(gameData.game);

        // Gérer les changements d'état critiques
        const newStatus = gameData.game.status;
        const currentStatus = gameState?.status;

        if (currentStatus !== newStatus) {
          console.log(`Game status changed: ${currentStatus} → ${newStatus}`);

          // Réinitialiser les états lors des transitions importantes
          if (newStatus === 'QUESTION_ACTIVE' || newStatus === 'IN_PROGRESS') {
            setShowingResults(false);
            setCurrentQuestionResults([]);
          } else if (newStatus === 'RESULTS_DISPLAY') {
            setShowingResults(true);
          }
        }

        // Détecter si tous les joueurs ont répondu
        if (gameData.game.allPlayersAnswered && !showingResults) {
          setShowingResults(true);
        }
      } else {
        // Si pas de jeu retourné, le jeu n'existe plus
        setGameState(null);
        setCurrentQuestion(null);
        setQuestionResults(null);
        setMessages([]);
        setReactions([]);
        setMicroChallenge(null);
        setIsHost(false);
        return;
      }

      if (gameData.question) {
        setCurrentQuestion(gameData.question);
      }
      if (gameData.messages) {
        setMessages(gameData.messages);
      }
      if (reactionsData.reactions) {
        setReactions(reactionsData.reactions);
      }
      if (challengeData.challenge) {
        setMicroChallenge(challengeData.challenge);
      } else {
        setMicroChallenge(null);
      }
    } catch (err) {
      const syncDuration = Date.now() - syncStartTime;
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('timeout')) {
        setSyncTimeouts(prev => prev + 1);
        setConnectionStatus('error');
        setSyncHealth('critical');
      } else if (message.includes('404') || message.includes('Game not found')) {
        // Jeu n'existe plus, nettoyer l'état
        setGameState(null);
        setCurrentQuestion(null);
        setQuestionResults(null);
        setMessages([]);
        setReactions([]);
        setMicroChallenge(null);
        setIsHost(false);
        setConnectionStatus('disconnected');
        return;
      } else {
        // Erreur réseau temporaire
        setFailedSyncCount(prev => prev + 1);
        setConnectionStatus('error');

        if (failedSyncCount >= 3) {
          setSyncHealth('critical');
        } else if (failedSyncCount >= 1) {
          setSyncHealth('degraded');
        }

        console.warn('Network error during sync (keeping current state):', err);

        // Retry exponential backoff
        const retryDelay = Math.min(2000 + (failedSyncCount * 1000), 10000);
        setTimeout(() => {
          if (gameState?.roomCode) {
            refreshGameState();
          }
        }, retryDelay);
      }
    }
  }, [gameState?.roomCode, gameState?.status, showingResults, failedSyncCount, apiCall]);

  // Passer à la question suivante (multijoueur)
  const nextQuestion = useCallback(async (roomCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('/api/games/next-question', {
        method: 'POST',
        body: JSON.stringify({ roomCode }),
      });

      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
        setCurrentQuestionNumber(prev => prev + 1);
        setShowingResults(false);
        setCurrentQuestionResults([]);
      } else if (data.results) {
        setQuestionResults(data.results);
      }

      if (data.game) {
        setGameState(data.game);
      }
    } catch (err) {
      console.error('Error advancing to next question:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Envoyer une réaction
  const sendReaction = useCallback(async (roomCode: string, reaction: string, questionId?: string) => {
    try {
      await apiCall('/api/reactions', {
        method: 'POST',
        body: JSON.stringify({ roomCode, reaction, questionId }),
      });
      // Les réactions seront récupérées lors du prochain refresh
    } catch (err) {
      console.error('Error sending reaction:', err);
    }
  }, [apiCall]);

  // Créer un micro-défi
  const createMicroChallenge = useCallback(async (roomCode: string) => {
    try {
      await apiCall('/api/micro-challenges', {
        method: 'POST',
        body: JSON.stringify({ roomCode, type: 'create' }),
      });
      // Le défi sera récupéré lors du prochain refresh
    } catch (err) {
      console.error('Error creating micro challenge:', err);
    }
  }, [apiCall]);

  // Répondre à un micro-défi
  const respondToMicroChallenge = useCallback(async (roomCode: string, challengeId: string, response: string) => {
    try {
      await apiCall('/api/micro-challenges', {
        method: 'POST',
        body: JSON.stringify({ roomCode, type: 'respond', challengeId, response }),
      });
      // Les réponses seront récupérées lors du prochain refresh
    } catch (err) {
      console.error('Error responding to micro challenge:', err);
    }
  }, [apiCall]);

  // Récupérer un jeu en cours
  const recoverGame = useCallback(async () => {
    if (!user) return;

    try {
      const data = await apiCall('/api/games/recover');

      if (data.game) {
        setGameState(data.game);
        setIsHost(!!(data.game?.hostId && user?.id && data.game.hostId === user.id));

        // Récupérer le numéro de question basé sur currentQuestionIndex
        if (data.game.currentQuestionIndex !== undefined) {
          setCurrentQuestionNumber(data.game.currentQuestionIndex + 1);
        }

        if (data.question) {
          setCurrentQuestion(data.question);
        }
        if (data.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Error recovering game:', err);
    }
  }, [user, apiCall]);

  // Force une synchronisation immédiate
  const forceSyncNow = useCallback(async () => {
    console.log('Forcing immediate synchronization...');
    await refreshGameState();
  }, [refreshGameState]);

  // Auto-récupération au montage du composant
  useEffect(() => {
    if (user) {
      recoverGame();
    }
  }, [user, recoverGame]);

  // Polling intelligent pour les mises à jour en temps réel
  useEffect(() => {
    if (!gameState || gameState.status === 'FINISHED' || !gameState.roomCode) return;

    let pollInterval = 2000; // Par défaut 2 secondes

    // Ajuster la fréquence selon l'état du jeu et le mode
    if (gameState.players.length > 1) {
      // Mode multijoueur - polling plus fréquent
      switch (gameState.status) {
        case 'QUESTION_ACTIVE':
          pollInterval = 1000; // Très fréquent pendant que les joueurs répondent
          break;
        case 'RESULTS_DISPLAY':
          pollInterval = 500; // Ultra fréquent pendant l'affichage des résultats
          break;
        case 'TRANSITION':
          pollInterval = 800; // Fréquent pendant les transitions
          break;
        case 'IN_PROGRESS':
          pollInterval = 1500; // Modéré pendant le jeu normal
          break;
        default:
          pollInterval = 2000;
      }

      // Polling encore plus fréquent si tous ont répondu mais pas encore en mode résultats
      if (gameState.allPlayersAnswered && gameState.status !== 'RESULTS_DISPLAY') {
        pollInterval = 500;
      }

      // Polling fréquent s'il y a des micro-challenges actifs
      if (microChallenge) {
        pollInterval = Math.min(pollInterval, 1000);
      }
    } else {
      // Mode solo - polling moins fréquent
      pollInterval = 3000;
    }

    const interval = setInterval(() => {
      refreshGameState();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [gameState?.status, gameState?.allPlayersAnswered, gameState?.players?.length, microChallenge, refreshGameState]);

  const value: GameContextType = {
    gameState,
    currentQuestion,
    questionResults,
    messages,
    reactions,
    microChallenge,
    isHost,
    loading,
    error,
    currentQuestionNumber,
    showingResults,
    currentQuestionResults,
    connectionStatus,
    lastSyncTime,
    syncHealth,
    joinGame,
    leaveGame,
    markReady,
    startGame,
    submitAnswer,
    sendMessage,
    refreshGameState,
    recoverGame,
    nextQuestion,
    sendReaction,
    createMicroChallenge,
    respondToMicroChallenge,
    forceSyncNow,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;