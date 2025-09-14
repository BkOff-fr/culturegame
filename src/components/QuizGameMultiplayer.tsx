'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/context/SocketContext'

import AuthForm from '@/components/AuthForm'
import GameLobby from '@/components/GameLobby'
import GameRoomSocket from '@/components/GameRoomSocket'
import GamePlaySocket from '@/components/GamePlaySocket'
import GameResults from '@/components/GameResults'
import QuestionEditor from '@/components/QuestionEditor'
import Leaderboard from '@/components/Leaderboard'
import GameSettings from '@/components/GameSettings'
import Analytics from '@/components/Analytics'

type Screen = 'auth' | 'lobby' | 'editor' | 'settings' | 'waiting' | 'game' | 'results' | 'leaderboard' | 'analytics'

const QuizGameMultiplayer = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth')
  const [gameResults, setGameResults] = useState<any>(null)

  const { user, token, loading: authLoading } = useAuth()
  const { connected, gameState, currentQuestion, connect } = useSocket()

  // Auto-connect to socket when user is authenticated
  useEffect(() => {
    if (user && token && !connected && !authLoading) {
      console.log('Auto-connecting to socket with token...')
      connect(token)
    }
  }, [user, token, connected, authLoading, connect])

  // Handle authentication state changes
  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // User is authenticated
        if (gameState) {
          // User has an active game
          if (gameState.status === 'WAITING') {
            setCurrentScreen('waiting')
          } else if (gameState.status === 'IN_PROGRESS') {
            setCurrentScreen('game')
          } else if (gameState.status === 'FINISHED') {
            setCurrentScreen('results')
          }
        } else if (currentScreen === 'auth') {
          // No active game, go to lobby
          setCurrentScreen('lobby')
        }
      } else {
        // User not authenticated
        setCurrentScreen('auth')
      }
    }
  }, [user, authLoading, gameState?.status, currentScreen])

  // Handle game state changes during gameplay
  useEffect(() => {
    if (gameState?.status === 'IN_PROGRESS' && currentScreen !== 'game') {
      setCurrentScreen('game')
    } else if (gameState?.status === 'FINISHED' && currentScreen !== 'results') {
      setCurrentScreen('results')
    }
  }, [gameState?.status, currentScreen])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const handleCreateGameWithSettings = async (settings: any) => {
    try {
      // Create game via API
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ settings })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create game')
      }

      const data = await response.json()
      console.log('Game created:', data.game)

      // The socket will auto-connect to the game room
      setCurrentScreen('waiting')
    } catch (error) {
      console.error('Failed to create game with settings:', error)
      alert(error instanceof Error ? error.message : 'Failed to create game')
    }
  }

  const handleJoinGame = async (roomCode: string) => {
    try {
      // Join game via API first
      const response = await fetch('/api/games/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ roomCode })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to join game')
      }

      const data = await response.json()
      console.log('Joined game:', data.game)

      // The socket will auto-connect to the game room
      setCurrentScreen('waiting')
    } catch (error) {
      console.error('Failed to join game:', error)
      throw error
    }
  }

  const screens = {
    auth: () => <AuthForm onSuccess={() => setCurrentScreen('lobby')} />,

    lobby: () => <GameLobby
      onCreateRoom={() => setCurrentScreen('settings')}
      onJoinRoom={handleJoinGame}
      onOpenEditor={() => setCurrentScreen('editor')}
      onStartSolo={() => {
        // Solo mode - create a single player game
        handleCreateGameWithSettings({
          maxPlayers: 1,
          timePerQuestion: 30,
          categories: ['all'],
          difficulty: 'all'
        })
      }}
      onOpenLeaderboard={() => setCurrentScreen('leaderboard')}
      onOpenAnalytics={() => setCurrentScreen('analytics')}
    />,

    settings: () => <GameSettings
      onClose={() => setCurrentScreen('lobby')}
      onStartGame={handleCreateGameWithSettings}
    />,

    editor: () => <QuestionEditor onClose={() => setCurrentScreen('lobby')} />,

    waiting: () => <GameRoomSocket
      onStartGame={() => setCurrentScreen('game')}
      onLeaveGame={() => setCurrentScreen('lobby')}
    />,

    game: () => <GamePlaySocket
      onGameEnd={(results) => {
        setGameResults(results)
        setCurrentScreen('results')
      }}
    />,

    results: () => <GameResults
      results={gameResults}
      onPlayAgain={() => {
        // Create a new game with same settings
        if (gameState?.settings) {
          handleCreateGameWithSettings(gameState.settings)
        } else {
          setCurrentScreen('lobby')
        }
      }}
      onBackToLobby={() => setCurrentScreen('lobby')}
    />,

    leaderboard: () => <Leaderboard onClose={() => setCurrentScreen('lobby')} />,

    analytics: () => <Analytics onClose={() => setCurrentScreen('lobby')} />
  }

  // Show connection status for debugging
  const showDebugInfo = process.env.NODE_ENV === 'development'

  return (
    <div className="relative">
      {showDebugInfo && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
          <div>Screen: {currentScreen}</div>
          <div>Auth: {user ? 'Yes' : 'No'}</div>
          <div>Socket: {connected ? 'Connected' : 'Disconnected'}</div>
          <div>Game: {gameState ? gameState.status : 'None'}</div>
        </div>
      )}
      {screens[currentScreen]()}
    </div>
  )
}

export default QuizGameMultiplayer