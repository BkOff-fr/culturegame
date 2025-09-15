'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Users, Trophy, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/context/GameContext'
import { useAuth } from '@/context/AuthContext'

interface GamePlayProps {
  onGameEnd: (results: any) => void
}

const GamePlay: React.FC<GamePlayProps> = ({ onGameEnd }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [answered, setAnswered] = useState(false)
  const [error, setError] = useState('')

  const { user } = useAuth()
  const {
    gameState,
    currentQuestion,
    questionResults,
    submitAnswer,
    refreshGameState
  } = useGame()

  // Refresh game state every second during gameplay
  useEffect(() => {
    const interval = setInterval(() => {
      refreshGameState()
    }, 1000)

    return () => clearInterval(interval)
  }, [refreshGameState])

  // Monitor game status changes
  useEffect(() => {
    if (gameState?.status === 'FINISHED' && questionResults) {
      onGameEnd(questionResults)
    }
  }, [gameState?.status, questionResults, onGameEnd])

  // Timer countdown
  useEffect(() => {
    if (currentQuestion && !answered && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !answered) {
      // Auto-submit when time runs out
      handleSubmitAnswer()
    }
  }, [timeLeft, answered, currentQuestion])

  // Reset timer when new question appears
  useEffect(() => {
    if (currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit || 30)
      setSelectedAnswer(null)
      setAnswered(false)
      setError('')
    }
  }, [currentQuestion?.id])

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !gameState?.roomCode || answered) return

    setAnswered(true)
    setError('')

    try {
      const timeSpent = (currentQuestion.timeLimit || 30) - timeLeft
      await submitAnswer(gameState.roomCode, currentQuestion.id, selectedAnswer, timeSpent)
    } catch (error) {
      console.error('Failed to submit answer:', error)
      setError('Failed to submit answer')
      setAnswered(false)
    }
  }

  if (!gameState || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading question...</div>
      </div>
    )
  }

  const renderQuestionContent = () => {
    switch (currentQuestion.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => !answered && setSelectedAnswer(option)}
                disabled={answered}
                className={`w-full p-4 text-left rounded-lg border transition-all ${
                  selectedAnswer === option
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                } ${answered ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
              </motion.button>
            ))}
          </div>
        )

      case 'TRUE_FALSE':
        return (
          <div className="grid grid-cols-2 gap-4">
            {['True', 'False'].map((option) => (
              <motion.button
                key={option}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => !answered && setSelectedAnswer(option === 'True')}
                disabled={answered}
                className={`p-6 rounded-lg border transition-all ${
                  selectedAnswer === (option === 'True')
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                } ${answered ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {option}
              </motion.button>
            ))}
          </div>
        )

      case 'TEXT_INPUT':
        return (
          <div>
            <input
              type="text"
              value={selectedAnswer || ''}
              onChange={(e) => !answered && setSelectedAnswer(e.target.value)}
              disabled={answered}
              className="w-full p-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none disabled:opacity-60"
              placeholder="Type your answer..."
            />
          </div>
        )

      default:
        return (
          <div className="text-slate-400 text-center py-8">
            Question type not supported yet
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <span className={`text-xl font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-slate-200'}`}>
                {timeLeft}s
              </span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Question {(gameState.currentQuestionIndex || 0) + 1}
              </span>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{gameState.players?.length || 0}</span>
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-slate-400" />
              <span className="text-xl font-semibold text-slate-200">
                {gameState.players?.find(p => p.user.id === user?.id)?.score || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8 max-w-4xl w-full">

            {/* Question Text */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-slate-400 text-sm uppercase tracking-wider">
                  {currentQuestion.category || 'General'}
                </span>
              </div>

              <h2 className="text-2xl font-semibold text-slate-100 mb-4">
                {currentQuestion.text}
              </h2>

              {currentQuestion.imageUrl && (
                <div className="mb-6">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question"
                    className="max-w-full h-auto rounded-lg border border-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Question Content */}
            <div className="mb-8">
              {renderQuestionContent()}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitAnswer}
                disabled={answered || !selectedAnswer}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                {answered ? 'Submitted' : 'Submit Answer'}
              </motion.button>
            </div>

            {error && (
              <div className="mt-4 bg-red-950/50 border border-red-800 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            {answered && (
              <div className="mt-4 bg-green-950/50 border border-green-800 rounded-lg p-3">
                <p className="text-green-300 text-sm text-center">
                  Answer submitted! Waiting for other players...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Players Status */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Players</span>
                <span className="text-slate-400 text-sm">
                  {gameState.players?.filter(p => p.hasAnswered).length || 0} / {gameState.players?.length || 0} answered
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {gameState.players?.map((player) => (
                  <div
                    key={player.id}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium ${
                      player.hasAnswered
                        ? 'bg-green-900/50 text-green-300 border border-green-800'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {player.user.username}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamePlay