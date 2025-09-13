'use client'

import React, { useState, useEffect } from 'react'
import { Brain, Users, Zap, Edit3, ChevronRight } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { useGame, GameProvider } from '@/context/GameContext'

import AuthForm from '@/components/AuthForm'
import GameLobby from '@/components/GameLobby'
import GameRoom from '@/components/GameRoom'
import GamePlay from '@/components/GamePlay'
import GameResults from '@/components/GameResults'
import QuestionEditor from '@/components/QuestionEditor'
import Leaderboard from '@/components/Leaderboard'
import GameSettings from '@/components/GameSettings'
import Analytics from '@/components/Analytics'

type Screen = 'auth' | 'lobby' | 'editor' | 'waiting' | 'game' | 'results' | 'leaderboard' | 'settings' | 'analytics'

const QuizGameInner = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth')
  const { user, loading: authLoading } = useAuth()
  const { currentGame, createGame } = useGame()

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        if (currentGame && currentScreen === 'auth') {
          setCurrentScreen('waiting')
        } else if (!currentGame && currentScreen === 'auth') {
          setCurrentScreen('lobby')
        } else if (!currentGame && currentScreen === 'waiting') {
          setCurrentScreen('lobby')
        }
      } else {
        setCurrentScreen('auth')
      }
    }
  }, [user, authLoading, currentGame])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  const handleCreateGameWithSettings = async (settings: any) => {
    try {
      await createGame(settings)
      setCurrentScreen('waiting')
    } catch (error) {
      console.error('Failed to create game with settings:', error)
    }
  }

  const screens = {
    auth: () => <AuthForm onSuccess={() => setCurrentScreen('lobby')} />,
    lobby: () => <GameLobby 
      onCreateRoom={() => setCurrentScreen('settings')}
      onJoinRoom={() => setCurrentScreen('waiting')}
      onOpenEditor={() => setCurrentScreen('editor')}
      onStartSolo={() => setCurrentScreen('game')}
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
      onGameEnd={() => setCurrentScreen('results')}
    />,
    results: () => <GameResults 
      onPlayAgain={() => setCurrentScreen('game')}
      onBackToLobby={() => setCurrentScreen('lobby')}
    />,
    leaderboard: () => <Leaderboard onClose={() => setCurrentScreen('lobby')} />,
    analytics: () => <Analytics onClose={() => setCurrentScreen('lobby')} />
  }

  return screens[currentScreen]()
}

const QuizGame = () => {
  return (
    <GameProvider>
      <QuizGameInner />
    </GameProvider>
  )
}

export default QuizGame