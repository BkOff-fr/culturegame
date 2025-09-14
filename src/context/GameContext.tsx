'use client'

import React, { createContext, useContext, useState } from 'react'

interface GamePlayer {
  id: string
  score: number
  user: {
    id: string
    username: string
    avatar: string
  }
}

interface Game {
  id: string
  roomCode: string
  hostId: string
  status: string
  settings: any
  players: GamePlayer[]
}

interface Question {
  id: string
  type: string
  question: string
  data: any
  category: string
  difficulty: string
  points: number
  timeLimit: number
}

interface GameContextType {
  currentGame: Game | null
  questions: Question[]
  loading: boolean
  createGame: (settings?: any) => Promise<Game>
  joinGame: (roomCode: string) => Promise<Game>
  leaveGame: () => void
  loadQuestions: (filters?: any) => Promise<Question[]>
  createQuestion: (questionData: any) => Promise<any>
  startGame: (gameId: string) => Promise<Game>
  checkActiveGame: () => Promise<void>
  setCurrentGame: (game: Game | null) => void
}

const GameContext = createContext<GameContextType | null>(null)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  
  console.log('GameProvider - currentGame state:', currentGame)
  
  // Check for active game when component mounts
  React.useEffect(() => {
    const checkActiveGame = async () => {
      if (initialized) return
      setInitialized(true)
      
      try {
        const response = await fetch('/api/games/active', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.game) {
            console.log('Found active game:', data.game)
            setCurrentGame(data.game)
          } else {
            console.log('No active game found')
            setCurrentGame(null)
          }
        }
      } catch (error) {
        console.log('Error checking for active game:', error)
        setCurrentGame(null)
      }
    }
    
    checkActiveGame()
  }, [])

  const createGame = async (settings?: any) => {
    setLoading(true)
    try {
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
      console.log('Create game response:', data)
      setCurrentGame(data.game)
      console.log('Current game set to:', data.game)
      return data.game
    } catch (error) {
      console.error('Create game error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const joinGame = async (roomCode: string) => {
    setLoading(true)
    try {
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
      setCurrentGame(data.game)
      return data.game
    } catch (error) {
      console.error('Join game error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const leaveGame = () => {
    setCurrentGame(null)
  }

  const loadQuestions = async (filters?: {
    categories?: string[]
    category?: string
    difficulty?: string
    limit?: number
    isPublic?: boolean
  }) => {
    try {
      const params = new URLSearchParams()
      
      // Support pour multiple catégories
      if (filters?.categories && filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','))
      } else if (filters?.category) {
        params.append('category', filters.category)
      }
      
      if (filters?.difficulty) params.append('difficulty', filters.difficulty)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.isPublic) params.append('public', 'true')

      console.log('Loading questions with filters:', filters)
      console.log('API URL:', `/api/questions?${params}`)

      const response = await fetch(`/api/questions?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load questions')
      }

      const data = await response.json()
      console.log(`Loaded ${data.questions.length} questions`)
      setQuestions(data.questions)
      return data.questions
    } catch (error) {
      console.error('Load questions error:', error)
      throw error
    }
  }

  const createQuestion = async (questionData: {
    type: string
    question: string
    data: any
    category: string
    difficulty?: string
    points?: number
    timeLimit?: number
    isPublic?: boolean
  }) => {
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(questionData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create question')
      }

      const data = await response.json()
      return data.question
    } catch (error) {
      console.error('Create question error:', error)
      throw error
    }
  }

  const startGame = async (gameId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/games/${gameId}/start`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start game')
      }

      const data = await response.json()
      console.log('Game started:', data)
      setCurrentGame(data.game)
      return data.game
    } catch (error) {
      console.error('Start game error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const checkActiveGame = async () => {
    try {
      const response = await fetch('/api/games/active', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.game) {
          console.log('Found active game:', data.game)
          setCurrentGame(data.game)
        } else {
          console.log('No active game found')
          setCurrentGame(null)
        }
      }
    } catch (error) {
      console.log('Error checking for active game:', error)
      setCurrentGame(null)
    }
  }

  return (
    <GameContext.Provider value={{
      currentGame,
      questions,
      loading,
      createGame,
      joinGame,
      leaveGame,
      loadQuestions,
      createQuestion,
      startGame,
      checkActiveGame,
      setCurrentGame
    }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}