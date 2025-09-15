'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Users, Trophy, Zap } from 'lucide-react'
import { useSocketGame } from '@/hooks/useSocketGame'
import { usePowerUps, usePowerUpEffects, usePowerUpUI } from '@/hooks/usePowerUps'
import { useAuth } from '@/context/AuthContext'
import PowerUpBar, { PowerUpEffect } from '@/components/PowerUps/PowerUpBar'
import { PowerUpType } from '@prisma/client'

interface GamePlaySocketProps {
  onGameEnd: (results: any) => void
}

const GamePlaySocket: React.FC<GamePlaySocketProps> = ({ onGameEnd }) => {
  const [answer, setAnswer] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [showResults, setShowResults] = useState(false)

  const { user } = useAuth()
  const {
    connected,
    gameState,
    currentQuestion,
    questionResults,
    submitQuestionAnswer,
    usePowerUpInGame
  } = useSocketGame()

  const {
    inventory,
    usePowerUp: usePowerUpAPI,
    refreshInventory
  } = usePowerUps({
    gameId: gameState?.gameId,
    userId: user?.id
  })

  const {
    hasEffect,
    addEffect,
    removeEffect,
    clearAllEffects
  } = usePowerUpEffects()

  const {
    currentAnimation,
    showEffect,
    triggerPowerUpAnimation
  } = usePowerUpUI()

  // Timer countdown
  useEffect(() => {
    if (!currentQuestion || hasAnswered || showResults) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentQuestion, hasAnswered, showResults])

  // Initialize question
  useEffect(() => {
    if (currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit)
      setHasAnswered(false)
      setAnswer(null)
      setStartTime(Date.now())
      setShowResults(false)
      clearAllEffects()
    }
  }, [currentQuestion])

  // Handle question results
  useEffect(() => {
    if (questionResults && questionResults.length > 0) {
      setShowResults(true)
      setHasAnswered(true)

      // Auto-hide results after 5 seconds
      setTimeout(() => {
        setShowResults(false)
      }, 4000)
    }
  }, [questionResults])

  // Check for game end
  useEffect(() => {
    if (gameState?.status === 'FINISHED') {
      onGameEnd({
        players: gameState.players,
        gameId: gameState.gameId
      })
    }
  }, [gameState?.status])

  const handleTimeUp = useCallback(() => {
    if (!hasAnswered && currentQuestion && startTime) {
      const timeSpent = Date.now() - startTime
      submitQuestionAnswer(currentQuestion.id, null, timeSpent)
      setHasAnswered(true)
    }
  }, [hasAnswered, currentQuestion, startTime, submitQuestionAnswer])

  const handleAnswerSubmit = useCallback((selectedAnswer: any) => {
    if (hasAnswered || !currentQuestion || !startTime) return

    // Check if time freeze effect is active
    const effectiveTime = hasEffect(PowerUpType.FREEZE_TIME) ?
      startTime : startTime

    const timeSpent = Date.now() - effectiveTime
    setAnswer(selectedAnswer)
    setHasAnswered(true)

    submitQuestionAnswer(currentQuestion.id, selectedAnswer, timeSpent)
  }, [hasAnswered, currentQuestion, startTime, hasEffect, submitQuestionAnswer])

  const handleUsePowerUp = useCallback(async (powerUpId: string, type: PowerUpType) => {
    if (!currentQuestion || hasAnswered) return

    try {
      // Use power-up via API
      await usePowerUpAPI(powerUpId, currentQuestion.id)

      // Use power-up via Socket
      usePowerUpInGame(powerUpId, type)

      // Trigger UI animation
      triggerPowerUpAnimation(type)

      // Add effect
      addEffect(type)

      // Refresh inventory
      await refreshInventory()
    } catch (error) {
      console.error('Error using power-up:', error)
    }
  }, [currentQuestion, hasAnswered, usePowerUpAPI, usePowerUpInGame, triggerPowerUpAnimation, addEffect, refreshInventory])

  const renderQuestionContent = () => {
    if (!currentQuestion) return null

    const questionData = currentQuestion.data
    const isDisabled = hasAnswered || timeLeft === 0

    switch (currentQuestion.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-3">
            {questionData.answers?.map((option: string, index: number) => {
              if (option === null) return null // Power-up 50/50 applied

              return (
                <motion.button
                  key={index}
                  whileHover={!isDisabled ? { scale: 1.02 } : undefined}
                  whileTap={!isDisabled ? { scale: 0.98 } : undefined}
                  onClick={() => handleAnswerSubmit(index)}
                  disabled={isDisabled}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answer === index
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 bg-slate-800 hover:border-slate-500 hover:bg-slate-700'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      answer === index ? 'border-blue-500 bg-blue-500' : 'border-slate-500'
                    }`}>
                      {answer === index && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <span className="text-slate-100">{option}</span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )

      case 'TRUE_FALSE':
        return (
          <div className="flex gap-4">
            <motion.button
              whileHover={!isDisabled ? { scale: 1.05 } : undefined}
              whileTap={!isDisabled ? { scale: 0.95 } : undefined}
              onClick={() => handleAnswerSubmit(true)}
              disabled={isDisabled}
              className={`flex-1 py-6 rounded-lg border-2 font-semibold text-lg transition-all ${
                answer === true
                  ? 'border-green-500 bg-green-900/20 text-green-300'
                  : 'border-slate-600 bg-slate-800 text-slate-100 hover:border-green-500'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              ✓ VRAI
            </motion.button>

            <motion.button
              whileHover={!isDisabled ? { scale: 1.05 } : undefined}
              whileTap={!isDisabled ? { scale: 0.95 } : undefined}
              onClick={() => handleAnswerSubmit(false)}
              disabled={isDisabled}
              className={`flex-1 py-6 rounded-lg border-2 font-semibold text-lg transition-all ${
                answer === false
                  ? 'border-red-500 bg-red-900/20 text-red-300'
                  : 'border-slate-600 bg-slate-800 text-slate-100 hover:border-red-500'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              ✗ FAUX
            </motion.button>
          </div>
        )

      case 'TEXT_INPUT':
        return (
          <div className="space-y-4">
            <input
              type="text"
              value={answer || ''}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isDisabled}
              className="w-full p-4 bg-slate-800 border-2 border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              placeholder="Tapez votre réponse..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && answer && !isDisabled) {
                  handleAnswerSubmit(answer)
                }
              }}
            />

            <motion.button
              whileHover={!isDisabled && answer ? { scale: 1.05 } : undefined}
              whileTap={!isDisabled && answer ? { scale: 0.95 } : undefined}
              onClick={() => handleAnswerSubmit(answer)}
              disabled={!answer || isDisabled}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Valider
            </motion.button>
          </div>
        )

      default:
        return (
          <div className="text-center text-slate-400">
            Type de question non supporté: {currentQuestion.type}
          </div>
        )
    }
  }

  const renderHint = () => {
    if (!currentQuestion?.data?.hint) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg"
      >
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <span className="text-lg">💡</span>
          <span className="font-semibold">Indice</span>
        </div>
        <p className="text-yellow-100">{currentQuestion.data.hint}</p>
      </motion.div>
    )
  }

  // Loading state
  if (!connected || !gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Chargement de la partie...</div>
        </div>
      </div>
    )
  }

  // Waiting for question
  if (!currentQuestion && !showResults) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-4">En attente de la prochaine question...</h2>
          <div className="text-slate-400">
            Question {(gameState.currentQuestionIndex || 0) + 1} / {gameState.totalQuestions || 0}
          </div>
        </div>
      </div>
    )
  }

  // Question results view
  if (showResults && questionResults) {
    const currentPlayerResult = questionResults.find(r => r.playerId === user?.id)

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 max-w-2xl w-full"
        >
          <div className="text-center mb-8">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ duration: 1 }}
              className="text-8xl mb-4"
            >
              {currentPlayerResult?.isCorrect ? '🎉' : '💔'}
            </motion.div>

            <h2 className={`text-3xl font-bold mb-4 ${
              currentPlayerResult?.isCorrect ? 'text-green-400' : 'text-red-400'
            }`}>
              {currentPlayerResult?.isCorrect ? 'Correct !' : 'Incorrect !'}
            </h2>

            {currentPlayerResult && (
              <div className="text-xl text-slate-300 mb-6">
                Vous avez gagné {currentPlayerResult.pointsEarned} points
                <br />
                <span className="text-sm text-slate-500">
                  Temps: {(currentPlayerResult.timeSpent / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-4">Scores actuels</h3>
            {questionResults
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((result, index) => (
                <div
                  key={result.playerId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.playerId === user?.id
                      ? 'bg-blue-900/20 border border-blue-600/50'
                      : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-black' :
                      index === 1 ? 'bg-slate-300 text-black' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-slate-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{result.username}</span>
                    {result.isCorrect && <span className="text-green-400 text-sm">+{result.pointsEarned}</span>}
                  </div>
                  <span className="text-white font-bold">{result.totalScore}</span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    )
  }

  // Main game view
  return (
    <div className="min-h-screen bg-slate-950 p-4 relative">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      {/* Game header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">{gameState.players.length} joueurs</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Question</span>
                <span className="text-white font-bold">
                  {(gameState.currentQuestionIndex || 0) + 1} / {gameState.totalQuestions || 0}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {hasEffect(PowerUpType.FREEZE_TIME) && (
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <span className="animate-pulse">❄️</span>
                  <span>FREEZE TIME</span>
                </div>
              )}

              {hasEffect(PowerUpType.DOUBLE_POINTS) && (
                <div className="flex items-center gap-2 text-yellow-400 font-bold">
                  <span className="animate-bounce">⭐</span>
                  <span>DOUBLE POINTS</span>
                </div>
              )}

              <div className={`flex items-center gap-2 ${
                timeLeft <= 10 ? 'text-red-400' : 'text-slate-300'
              }`}>
                <Clock className={`w-5 h-5 ${timeLeft <= 10 ? 'animate-pulse' : ''}`} />
                <span className="text-2xl font-bold font-mono">{timeLeft}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question content */}
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-6"
        >
          {/* Hint if available */}
          {renderHint()}

          {/* Question */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {currentQuestion?.question}
            </h2>

            <div className="text-sm text-slate-400 mb-4">
              Catégorie: {currentQuestion?.category || 'Général'} •
              Difficulté: {currentQuestion?.difficulty || 'Moyen'}
            </div>
          </div>

          {/* Answer options */}
          {renderQuestionContent()}

          {/* Progress bar */}
          <div className="mt-6">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <motion.div
                initial={{ width: '100%' }}
                animate={{
                  width: hasEffect(PowerUpType.FREEZE_TIME) ? '100%' : `${(timeLeft / (currentQuestion?.timeLimit || 30)) * 100}%`
                }}
                transition={{ duration: 0.5 }}
                className={`h-2 rounded-full ${
                  timeLeft <= 10 ? 'bg-red-500' : 'bg-blue-500'
                }`}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Power-ups bar */}
      <PowerUpBar
        inventory={inventory}
        onUsePowerUp={handleUsePowerUp}
        questionType={currentQuestion?.type || ''}
        gameId={gameState.gameId}
        questionId={currentQuestion?.id || ''}
        disabled={hasAnswered || timeLeft === 0}
      />

      {/* Power-up effect animation */}
      <AnimatePresence>
        {showEffect && currentAnimation && (
          <PowerUpEffect
            type={currentAnimation}
            onComplete={() => {/* Effect completed */}}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default GamePlaySocket