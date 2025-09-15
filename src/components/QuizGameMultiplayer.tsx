'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useGame } from '@/context/GameContext'

import AuthForm from '@/components/AuthForm'
import GameLobby from '@/components/GameLobby'
import GameRoom from '@/components/GameRoom'
import GamePlay from '@/components/GamePlay'
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
  const { gameState, currentQuestion, recoverGame, joinGame } = useGame()

  // Auto-recover game when user is authenticated
  useEffect(() => {
    if (user && !authLoading) {
      console.log('Auto-recovering game session...')
      recoverGame()
    }
  }, [user, authLoading, recoverGame])

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

      // Ensure context has the new game before moving to waiting
      await recoverGame()

      // Navigate to waiting screen
      setCurrentScreen('waiting')
    } catch (error) {
      console.error('Failed to create game with settings:', error)
      alert(error instanceof Error ? error.message : 'Failed to create game')
    }
  }

  const handleJoinGame = async (roomCode: string) => {
    try {
      const success = await joinGame(roomCode)
      if (success) {
        setCurrentScreen('waiting')
      } else {
        throw new Error('Failed to join game')
      }
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

    waiting: () => <GameRoom
      onStartGame={() => setCurrentScreen('game')}
      onLeaveGame={() => setCurrentScreen('lobby')}
    />,

    game: () => <GamePlay
      onGameEnd={(results) => {
        setGameResults(results)
        setCurrentScreen('results')
      }}
      onLeaveGame={() => setCurrentScreen('lobby')}
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
  return (
    <div className="relative">
      {screens[currentScreen]()}
    </div>
  )
}

export default QuizGameMultiplayer