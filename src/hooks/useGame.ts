'use client'

import { useState, useEffect } from 'react'

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

export const useGame = () => {
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  
  console.log('useGame - currentGame state:', currentGame)

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
    category?: string
    difficulty?: string
    limit?: number
    isPublic?: boolean
  }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.category) params.append('category', filters.category)
      if (filters?.difficulty) params.append('difficulty', filters.difficulty)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.isPublic) params.append('public', 'true')

      const response = await fetch(`/api/questions?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load questions')
      }

      const data = await response.json()
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

  return {
    currentGame,
    questions,
    loading,
    createGame,
    joinGame,
    leaveGame,
    loadQuestions,
    createQuestion
  }
}