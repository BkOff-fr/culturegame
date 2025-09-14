'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { PowerUpType } from '@prisma/client';

export interface UseSocketGameReturn {
  // Socket connection state
  connected: boolean;
  gameState: any;
  currentQuestion: any;
  questionResults: any[];
  messages: any[];
  isHost: boolean;

  // Game actions
  connectToGame: () => Promise<void>;
  joinGameRoom: (roomCode: string) => void;
  leaveGameRoom: () => void;
  markPlayerReady: () => void;
  startGameSession: () => void;
  submitQuestionAnswer: (questionId: string, answer: any, timeSpent: number) => void;
  usePowerUpInGame: (powerUpId: string, powerUpType: PowerUpType) => void;
  sendGameMessage: (message: string, type?: 'PREDEFINED' | 'CUSTOM') => void;
}

export function useSocketGame(): UseSocketGameReturn {
  const { user, token } = useAuth();
  const { currentGame, setCurrentGame } = useGame();
  const {
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
  } = useSocket();

  // Auto-connect when user is authenticated
  const connectToGame = useCallback(async () => {
    if (user && token && !connected) {
      try {
        await connect(token);
      } catch (error) {
        console.error('Failed to connect to game socket:', error);
      }
    }
  }, [user, token, connected, connect]);

  // Join game room
  const joinGameRoom = useCallback((roomCode: string) => {
    if (connected) {
      joinGame(roomCode);
    } else {
      console.error('Socket not connected, cannot join game');
    }
  }, [connected, joinGame]);

  // Leave game room
  const leaveGameRoom = useCallback(() => {
    if (connected && currentGame) {
      leaveGame(currentGame.roomCode);
      // Also clear the game context
      setCurrentGame?.(null);
    }
  }, [connected, currentGame, leaveGame, setCurrentGame]);

  // Mark player as ready
  const markPlayerReady = useCallback(() => {
    if (connected && currentGame) {
      markReady(currentGame.roomCode);
    }
  }, [connected, currentGame, markReady]);

  // Start game session (host only)
  const startGameSession = useCallback(() => {
    if (connected && currentGame && isHost) {
      startGame(currentGame.roomCode);
    }
  }, [connected, currentGame, isHost, startGame]);

  // Submit answer to current question
  const submitQuestionAnswer = useCallback((
    questionId: string,
    answer: any,
    timeSpent: number
  ) => {
    if (connected && currentGame) {
      submitAnswer(currentGame.roomCode, questionId, answer, timeSpent);
    }
  }, [connected, currentGame, submitAnswer]);

  // Use power-up in current game
  const usePowerUpInGame = useCallback((
    powerUpId: string,
    powerUpType: PowerUpType
  ) => {
    if (connected && currentGame) {
      usePowerUp(currentGame.roomCode, powerUpId, powerUpType);
    }
  }, [connected, currentGame, usePowerUp]);

  // Send chat message
  const sendGameMessage = useCallback((
    message: string,
    type: 'PREDEFINED' | 'CUSTOM' = 'PREDEFINED'
  ) => {
    if (connected && currentGame) {
      sendMessage(currentGame.roomCode, message, type);
    }
  }, [connected, currentGame, sendMessage]);

  // Auto-connect on mount if authenticated
  useEffect(() => {
    if (user && token && !connected) {
      connectToGame();
    }
  }, [user, token, connected, connectToGame]);

  // Auto-join game if we have a current game from context (one-time only)
  useEffect(() => {
    if (connected && currentGame && !gameState) {
      console.log('Auto-joining game from context:', currentGame.roomCode);
      joinGame(currentGame.roomCode);
    }
  }, [connected, currentGame?.roomCode, gameState, joinGame]); // Use joinGame directly instead of joinGameRoom

  // Sync socket game state with game context (only when socket state changes)
  useEffect(() => {
    if (gameState && setCurrentGame) {
      const syncedGame = {
        id: gameState.gameId,
        roomCode: gameState.roomCode,
        hostId: gameState.hostId,
        status: gameState.status,
        settings: gameState.settings,
        players: gameState.players.map((p: any) => ({
          id: p.id,
          score: p.score,
          user: {
            id: p.userId,
            username: p.username,
            avatar: p.avatar
          }
        }))
      };

      // Only update if different to prevent unnecessary re-renders
      if (!currentGame || currentGame.id !== gameState.gameId) {
        setCurrentGame(syncedGame);
      }
    }
  }, [gameState?.gameId, gameState?.status, gameState?.players?.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connected) {
        disconnect();
      }
    };
  }, []);

  return {
    connected,
    gameState,
    currentQuestion,
    questionResults,
    messages,
    isHost,
    connectToGame,
    joinGameRoom,
    leaveGameRoom,
    markPlayerReady,
    startGameSession,
    submitQuestionAnswer,
    usePowerUpInGame,
    sendGameMessage
  };
}