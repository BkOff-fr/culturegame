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

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  gameState: GameState | null;
  currentQuestion: CurrentQuestion | null;
  questionResults: QuestionResult[] | null;
  messages: ChatMessageData[];
  isHost: boolean;

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
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[] | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [isHost, setIsHost] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();

  const connect = useCallback(async (token: string) => {
    try {
      if (socketRef.current?.connected) {
        return;
      }

      // Remove the first recovery check to prevent duplicates

      // Se connecter au serveur Socket.io intégré sur le même port que Next.js
      const newSocket = io('http://localhost:3000', {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Événements de connexion
      newSocket.on('connect', async () => {
        console.log('Connected to Socket.io server:', newSocket.id);
        setConnected(true);

        // Récupérer automatiquement une partie active après reconnexion
        try {
          const response = await fetch('/api/games/recover')
          const data = await response.json()

          if (data.game) {
            console.log('Auto-rejoining recovered game:', data.game.roomCode)
            newSocket.emit('join-game', { roomCode: data.game.roomCode })
          }
        } catch (error) {
          console.log('No game to auto-rejoin')
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from Socket.io server');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        setConnected(false);
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
      socketRef.current.emit('player-ready', { roomCode });
    }
  }, []);

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
      socketRef.current.emit('submit-answer', {
        roomCode,
        questionId,
        answer,
        timeSpent
      });
    }
  }, []);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: SocketContextType = {
    socket,
    connected,
    gameState,
    currentQuestion,
    questionResults,
    messages,
    isHost,
    connect,
    disconnect,
    joinGame,
    leaveGame,
    markReady,
    startGame,
    submitAnswer,
    usePowerUp,
    sendMessage
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