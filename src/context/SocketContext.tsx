'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { PowerUpType } from '@prisma/client';
import { ChatMessageData, SocketEvents } from '@/types/game';
import { useAuth } from '@/context/AuthContext';

interface Player {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isReady: boolean;
  socketId: string;
}

interface GameState {
  gameId: string;
  roomCode: string;
  hostId: string;
  players: Player[];
  status: 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED';
  settings: any;
  currentQuestionIndex?: number;
  totalQuestions?: number;
}

interface CurrentQuestion {
  id: string;
  type: string;
  question: string;
  data: any;
  timeLimit: number;
}

interface QuestionResult {
  playerId: string;
  username: string;
  answer: any;
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  timeSpent: number;
}

interface OptimisticUpdate {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  confirmed: boolean;
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  reconnectAttempts: number;
  lastDisconnectReason?: string;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connectionState: ConnectionState;
  gameState: GameState | null;
  currentQuestion: CurrentQuestion | null;
  questionResults: QuestionResult[] | null;
  messages: ChatMessageData[];
  isHost: boolean;
  pendingUpdates: OptimisticUpdate[];

  // Actions
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  joinGame: (roomCode: string) => void;
  leaveGame: (roomCode: string) => void;
  markReady: (roomCode: string) => void;
  startGame: (roomCode: string) => void;
  submitAnswer: (roomCode: string, questionId: string, answer: any, timeSpent: number) => void;
  usePowerUp: (roomCode: string, powerUpId: string, powerUpType: PowerUpType) => void;
  sendMessage: (roomCode: string, message: string, type?: 'PREDEFINED' | 'CUSTOM') => void;

  // Optimistic update functions
  optimisticUpdate: (type: string, data: any) => string;
  confirmUpdate: (updateId: string) => void;
  rollbackUpdate: (updateId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[] | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const connect = useCallback(async (token: string) => {
    try {
      if (socketRef.current?.connected) {
        return;
      }

      setConnectionState(prev => ({ ...prev, status: 'connecting' }));

      // Configuration dynamique de l'URL Socket.io
      const socketUrl = process.env.NODE_ENV === 'production'
        ? window.location.origin // En production, utiliser l'origine actuelle
        : (process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin);

      console.log('Connecting to Socket.io server:', socketUrl);

      // Enhanced Socket.io configuration with better reconnection strategy
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'], // WebSocket prioritaire
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000, // Increased max delay
        reconnectionAttempts: 10, // Increased attempts
        timeout: 20000, // Increased timeout
        forceNew: false, // Allow connection reuse
        query: {
          gameRecovery: 'true'
        }
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Enhanced connection event handling
      newSocket.on('connect', async () => {
        console.log('Connected to Socket.io server:', newSocket.id);
        setConnected(true);
        setConnectionState({
          status: 'connected',
          reconnectAttempts: 0
        });

        // Clear any pending reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Enhanced game recovery with recovery flag
        try {
          const response = await fetch('/api/games/recover', {
            credentials: 'include'
          });
          const data = await response.json();

          if (data.game) {
            console.log('Recovering game session:', data.game.roomCode);
            newSocket.emit('join-game', {
              roomCode: data.game.roomCode,
              recovery: true
            });
          }
        } catch (error) {
          console.log('No active game to recover');
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Disconnected from Socket.io server, reason:', reason);
        setConnected(false);
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected',
          lastDisconnectReason: reason
        }));

        // Enhanced reconnection logic based on disconnect reason
        const isTemporaryDisconnect = [
          'transport close',
          'ping timeout',
          'transport error'
        ].includes(reason);

        if (isTemporaryDisconnect && token && user) {
          handleReconnection(token);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        setConnected(false);
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected'
        }));

        // Attempt reconnection with exponential backoff
        if (token && user) {
          handleReconnection(token);
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected after ${attemptNumber} attempts`);
        setConnectionState(prev => ({
          ...prev,
          status: 'connected',
          reconnectAttempts: 0
        }));
      });

      newSocket.on('reconnecting', (attemptNumber) => {
        console.log(`Reconnecting... attempt ${attemptNumber}`);
        setConnectionState(prev => ({
          ...prev,
          status: 'reconnecting',
          reconnectAttempts: attemptNumber
        }));
      });

      // Événements de jeu
      newSocket.on('game-state', (data: GameState) => {
        console.log('Game state updated:', data);
        setGameState(data);
        setIsHost(data.players.find(p => p.userId === user?.id)?.isHost || false);
      });

      newSocket.on('joined-game', (data: { gameId: string; isHost: boolean; player: Player }) => {
        console.log('Joined game:', data);
        setIsHost(data.isHost);
      });

      // Removed unused player-ready-changed event

      newSocket.on('player-left', (data: { playerId: string; players: Player[] }) => {
        console.log('Player left:', data);
        setGameState(current => {
          if (current) {
            return {
              ...current,
              players: data.players
            };
          }
          return current;
        });
      });

      newSocket.on('new-question', (data: {
        question: CurrentQuestion;
        questionNumber: number;
        totalQuestions: number;
      }) => {
        console.log('New question:', data);
        setCurrentQuestion(data.question);
        setQuestionResults(null); // Reset previous results

        setGameState(current => {
          if (current) {
            return {
              ...current,
              currentQuestionIndex: data.questionNumber - 1,
              totalQuestions: data.totalQuestions
            };
          }
          return current;
        });
      });

      newSocket.on('player-answered', (data: { playerId: string; username: string }) => {
        console.log(`${data.username} answered the question`);
        // Optionally show UI feedback that player answered
      });

      newSocket.on('question-results', (data: {
        results: QuestionResult[];
        correctAnswer: any;
        explanation?: string;
        players: Player[];
      }) => {
        console.log('Question results:', data);
        setQuestionResults(data.results);
        setCurrentQuestion(null);

        // Update game state with new scores
        setGameState(current => {
          if (current) {
            return {
              ...current,
              players: data.players
            };
          }
          return current;
        });
      });

      newSocket.on('powerup-applied', (data: {
        powerUpType: PowerUpType;
        modifiedQuestion: any;
        currentQuestion: CurrentQuestion;
      }) => {
        console.log('Power-up applied:', data);
        setCurrentQuestion(data.currentQuestion);

        // Show power-up effect notification
        // This could trigger a UI animation or notification
      });

      newSocket.on('player-used-powerup', (data: {
        playerId: string;
        username: string;
        powerUpType: PowerUpType;
      }) => {
        console.log(`${data.username} used power-up: ${data.powerUpType}`);
        // Show notification that another player used a power-up
      });

      newSocket.on('game-ended', (data: {
        finalResults: Player[];
        winner: Player;
      }) => {
        console.log('Game ended:', data);
        setGameState(current => {
          if (current) {
            return {
              ...current,
              status: 'FINISHED',
              players: data.finalResults
            };
          }
          return current;
        });
      });

      newSocket.on('chat-message', (data: ChatMessageData) => {
        console.log('Chat message:', data);
        setMessages(prev => [...prev, {
          ...data,
          id: `${data.userId}-${data.timestamp}`,
          createdAt: new Date(data.timestamp)
        }]);
      });

      newSocket.on('player-disconnected', (data: { playerId: string; username: string }) => {
        console.log(`${data.username} disconnected temporarily`);
        // Could show a notification that player is temporarily disconnected
      });

      newSocket.on('player-reconnected', (data: { playerId: string; username: string }) => {
        console.log(`${data.username} reconnected`);
        // Could show a notification that player is back
      });

      newSocket.on('host-transferred', (data: { newHostId: string; newHostName: string }) => {
        console.log(`Host transferred to ${data.newHostName}`);

        setGameState(current => {
          if (current) {
            return {
              ...current,
              hostId: data.newHostId,
              players: current.players.map(p => ({
                ...p,
                isHost: p.userId === data.newHostId
              }))
            };
          }
          return current;
        });

        // Update isHost if we became the new host
        if (data.newHostId === user?.id) {
          setIsHost(true);
        }
      });

      newSocket.on('error', (data: { message: string }) => {
        console.error('Socket error:', data);
        alert(data.message); // In production, use a proper notification system
      });

    } catch (error) {
      console.error('Error connecting to socket:', error);
    }
  }, [user]);

  // Enhanced reconnection strategy with exponential backoff
  const handleReconnection = useCallback((token: string) => {
    if (reconnectTimeoutRef.current) return; // Already attempting reconnection

    setConnectionState(prev => {
      const maxReconnectAttempts = 10;

      if (prev.reconnectAttempts >= maxReconnectAttempts) {
        // Fallback to HTTP-based game state recovery
        recoverViaHTTP();
        return prev;
      }

      const delay = Math.min(1000 * Math.pow(2, prev.reconnectAttempts), 30000);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (token && user) {
          connect(token);
        }
      }, delay);

      return {
        ...prev,
        status: 'reconnecting',
        reconnectAttempts: prev.reconnectAttempts + 1
      };
    });
  }, [user]);

  // HTTP fallback for game state recovery
  const recoverViaHTTP = useCallback(async () => {
    try {
      const response = await fetch('/api/games/status', {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.game) {
        // Update local state from HTTP response
        setGameState(data.game);
        // Try to reconnect to socket
        if (user) {
          const authResponse = await fetch('/api/auth/me', {
            credentials: 'include'
          });
          const authData = await authResponse.json();
          if (authData.token) {
            await connect(authData.token);
          }
        }
      }
    } catch (error) {
      console.error('HTTP recovery failed:', error);
      // Could redirect to lobby or show error message
    }
  }, [user]);

  // Optimistic update functions
  const optimisticUpdate = useCallback((type: string, data: any): string => {
    const updateId = `${type}-${Date.now()}-${Math.random()}`;
    const update: OptimisticUpdate = {
      id: updateId,
      type,
      data,
      timestamp: Date.now(),
      confirmed: false
    };

    setPendingUpdates(prev => [...prev, update]);

    // Apply update immediately based on type
    switch (type) {
      case 'submit-answer':
        // Show immediate feedback that answer was submitted
        break;
      case 'player-ready':
        setGameState(current => {
          if (current && user) {
            return {
              ...current,
              players: current.players.map(p =>
                p.userId === user.id ? { ...p, isReady: true } : p
              )
            };
          }
          return current;
        });
        break;
      case 'join-game':
        // Show loading state or optimistic join
        break;
    }

    // Set timeout for rollback if not confirmed
    setTimeout(() => {
      setPendingUpdates(current => {
        const stillPending = current.find(u => u.id === updateId && !u.confirmed);
        if (stillPending) {
          rollbackUpdate(updateId);
          return current.filter(u => u.id !== updateId);
        }
        return current;
      });
    }, 5000);

    return updateId;
  }, [user]);

  const confirmUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev =>
      prev.map(update =>
        update.id === updateId ? { ...update, confirmed: true } : update
      )
    );

    // Clean up confirmed updates after a delay
    setTimeout(() => {
      setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
    }, 1000);
  }, []);

  const rollbackUpdate = useCallback((updateId: string) => {
    const update = pendingUpdates.find(u => u.id === updateId);
    if (!update) return;

    // Rollback the optimistic update based on type
    switch (update.type) {
      case 'player-ready':
        setGameState(current => {
          if (current && user) {
            return {
              ...current,
              players: current.players.map(p =>
                p.userId === user.id ? { ...p, isReady: false } : p
              )
            };
          }
          return current;
        });
        break;
    }

    setPendingUpdates(prev => prev.filter(u => u.id !== updateId));
  }, [pendingUpdates, user]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
      setGameState(null);
      setCurrentQuestion(null);
      setQuestionResults(null);
      setMessages([]);
      setIsHost(false);
    }
  }, []);

  const joinGame = useCallback((roomCode: string) => {
    if (socketRef.current) {
      console.log('Joining game:', roomCode);
      setMessages([]); // Clear previous messages
      socketRef.current.emit('join-game', { roomCode });
    }
  }, []);

  const leaveGame = useCallback((roomCode: string) => {
    if (socketRef.current) {
      console.log('Leaving game:', roomCode);
      socketRef.current.emit('leave-game', { roomCode });
      setGameState(null);
      setCurrentQuestion(null);
      setQuestionResults(null);
      setMessages([]);
      setIsHost(false);
    }
  }, []);

  const markReady = useCallback((roomCode: string) => {
    if (socketRef.current) {
      console.log('Marking as ready');

      // Apply optimistic update
      const updateId = optimisticUpdate('player-ready', { roomCode });

      socketRef.current.emit('player-ready', { roomCode, updateId });
    }
  }, [optimisticUpdate]);

  const startGame = useCallback((roomCode: string) => {
    if (socketRef.current && isHost) {
      console.log('Starting game');
      socketRef.current.emit('start-game', { roomCode });
    }
  }, [isHost]);

  const submitAnswer = useCallback((
    roomCode: string,
    questionId: string,
    answer: any,
    timeSpent: number
  ) => {
    if (socketRef.current) {
      console.log('Submitting answer:', { questionId, answer, timeSpent });

      // Apply optimistic update
      const updateId = optimisticUpdate('submit-answer', {
        questionId,
        answer,
        timeSpent
      });

      socketRef.current.emit('submit-answer', {
        roomCode,
        questionId,
        answer,
        timeSpent,
        updateId
      });
    }
  }, [optimisticUpdate]);

  const usePowerUp = useCallback((
    roomCode: string,
    powerUpId: string,
    powerUpType: PowerUpType
  ) => {
    if (socketRef.current) {
      console.log('Using power-up:', powerUpType);
      socketRef.current.emit('use-powerup', {
        roomCode,
        powerUpId,
        powerUpType
      });
    }
  }, []);

  const sendMessage = useCallback((
    roomCode: string,
    message: string,
    type: 'PREDEFINED' | 'CUSTOM' = 'PREDEFINED'
  ) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', {
        roomCode,
        message,
        type
      });
    }
  }, []);

  // Auto-disconnect when user logs out
  useEffect(() => {
    if (!user && socketRef.current) {
      console.log('User logged out, disconnecting socket...');
      disconnect();
    }
  }, [user, disconnect]);


  // Enhanced game state events with update confirmation
  useEffect(() => {
    if (!socket) return;

    // Listen for update confirmations
    socket.on('update-confirmed', (data: { updateId: string }) => {
      confirmUpdate(data.updateId);
    });

    // Enhanced game state updates with version tracking
    socket.on('game-state-update', (data: {
      gameId: string;
      state: GameState;
      timestamp: number;
      version: number;
    }) => {
      console.log('Game state update received:', data);
      setGameState(current => {
        // Only apply if this is a newer version
        if (!current || !current.version || data.version > current.version) {
          return { ...data.state, version: data.version };
        }
        return current;
      });
    });

    return () => {
      socket.off('update-confirmed');
      socket.off('game-state-update');
    };
  }, [socket, confirmUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  const value: SocketContextType = {
    socket,
    connected,
    connectionState,
    gameState,
    currentQuestion,
    questionResults,
    messages,
    isHost,
    pendingUpdates,
    connect,
    disconnect,
    joinGame,
    leaveGame,
    markReady,
    startGame,
    submitAnswer,
    usePowerUp,
    sendMessage,
    optimisticUpdate,
    confirmUpdate,
    rollbackUpdate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};