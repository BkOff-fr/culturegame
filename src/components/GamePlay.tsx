'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Users, Trophy, Zap, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/context/GameContext'
import { useAuth } from '@/context/AuthContext'
import ReactionBar, { FloatingReactions } from './ReactionBar'
import MicroChallenge from './MicroChallenge'
import CelebrationEffects from './CelebrationEffects'
import PerformanceIndicators from './PerformanceIndicators'

interface GamePlayProps {
  onGameEnd: (results: any) => void
  onLeaveGame?: () => void
}

const GamePlay: React.FC<GamePlayProps> = ({ onGameEnd, onLeaveGame }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [answered, setAnswered] = useState(false)
  const [error, setError] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; pointsEarned: number; streak: number } | null>(null)
  const [responseTimes, setResponseTimes] = useState<number[]>([])
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [totalAnswers, setTotalAnswers] = useState(0)

  const { user } = useAuth()
  const {
    gameState,
    currentQuestion,
    questionResults,
    currentQuestionNumber,
    showingResults,
    currentQuestionResults,
    reactions,
    microChallenge,
    isHost,
    submitAnswer,
    refreshGameState,
    leaveGame,
    nextQuestion,
    sendReaction,
    createMicroChallenge,
    respondToMicroChallenge
  } = useGame()

  // Le polling est déjà géré par GameContext (toutes les 2s)
  // Pas besoin de polling supplémentaire ici pour éviter les race conditions

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

  // Reset states when showing results ends (new question starts)
  useEffect(() => {
    if (!showingResults) {
      setSelectedAnswer(null)
      setAnswered(false)
      setError('')
    }
  }, [showingResults])

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !gameState?.roomCode || answered) return

    setAnswered(true)
    setError('')

    try {
      const timeSpent = (currentQuestion.timeLimit || 30) - timeLeft
      const result = await submitAnswer(gameState.roomCode, currentQuestion.id, selectedAnswer, timeSpent)

      // Enregistrer les performances
      setResponseTimes(prev => [...prev, timeSpent])
      setTotalAnswers(prev => prev + 1)

      // Si nous recevons un résultat (mode solo), déclencher la célébration
      if (result && typeof result === 'object' && 'isCorrect' in result) {
        if (result.isCorrect) {
          setCorrectAnswers(prev => prev + 1)
        }

        const currentPlayer = gameState.players?.find(p => p.user.id === user?.id)
        setLastResult({
          isCorrect: result.isCorrect,
          pointsEarned: result.pointsEarned || 0,
          streak: currentPlayer?.streak || 0
        })
        setShowCelebration(true)
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
      setError('Failed to submit answer')
      setAnswered(false)
    }
  }

  const handleLeaveGame = async () => {
    if (!gameState?.roomCode) return

    try {
      await leaveGame(gameState.roomCode)
      if (onLeaveGame) {
        onLeaveGame()
      }
    } catch (error) {
      console.error('Failed to leave game:', error)
      setError('Failed to leave game')
    }
  }

  const handleNextQuestion = async () => {
    if (!gameState?.roomCode) return

    try {
      await nextQuestion(gameState.roomCode)
    } catch (error) {
      console.error('Failed to advance to next question:', error)
      setError('Failed to advance to next question')
    }
  }

  const handleReaction = async (reaction: string) => {
    if (!gameState?.roomCode) return

    try {
      await sendReaction(gameState.roomCode, reaction, currentQuestion?.id)
    } catch (error) {
      console.error('Failed to send reaction:', error)
    }
  }

  const handleCreateMicroChallenge = async () => {
    if (!gameState?.roomCode) return

    try {
      await createMicroChallenge(gameState.roomCode)
    } catch (error) {
      console.error('Failed to create micro challenge:', error)
    }
  }

  const handleRespondToMicroChallenge = async (response: string) => {
    if (!gameState?.roomCode || !microChallenge?.id) return

    try {
      await respondToMicroChallenge(gameState.roomCode, microChallenge.id, response)
    } catch (error) {
      console.error('Failed to respond to micro challenge:', error)
    }
  }

  // Fonction pour déterminer quel bouton d'action afficher
  const renderActionButtons = () => {
    const isMultiplayer = gameState?.players?.length > 1
    const allAnswered = gameState?.allPlayersAnswered
    const isInResultsDisplay = gameState?.status === 'RESULTS_DISPLAY'

    // Mode solo ou joueur n'a pas encore répondu
    if (!answered && !allAnswered) {
      return (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmitAnswer}
          disabled={!selectedAnswer}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4" />
          Submit Answer
        </motion.button>
      )
    }

    // Affichage des résultats en mode multijoueur
    if (isMultiplayer && (isInResultsDisplay || (allAnswered && currentQuestionResults.length > 0))) {
      return (
        <div className="w-full">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-slate-100 mb-4 text-center">
              Résultats de cette question
            </h3>
            <div className="space-y-3">
              {currentQuestionResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    result.isCorrect
                      ? 'bg-green-900/30 border-green-700 text-green-300'
                      : 'bg-red-900/30 border-red-700 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                      {result.avatar ? (
                        <img src={result.avatar} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-sm font-medium">{result.username[0]}</span>
                      )}
                    </div>
                    <span className="font-medium">{result.username}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      {result.isCorrect ? '✓' : '✗'} {result.answer}
                    </span>
                    <span className="font-semibold text-yellow-400">
                      +{result.pointsEarned}
                    </span>
                    <span className="text-xs text-slate-400">
                      {result.timeSpent}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="flex justify-center gap-3">
              {!microChallenge && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateMicroChallenge}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Créer un défi
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextQuestion}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Question suivante
              </motion.button>
            </div>
          )}

          {!isHost && (
            <p className="text-center text-slate-400 text-sm">
              En attente que l'hôte passe à la question suivante...
            </p>
          )}
        </div>
      )
    }

    // Attente des autres joueurs (multijoueur)
    if (isMultiplayer && answered && !allAnswered) {
      return (
        <div className="text-center">
          <div className="mb-4 bg-blue-950/50 border border-blue-800 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              Réponse soumise ! En attente des autres joueurs...
            </p>
            <div className="mt-2 text-xs text-slate-400">
              {gameState.players?.filter(p => p.hasAnswered).length || 0} / {gameState.players?.length || 0} ont répondu
            </div>
          </div>
        </div>
      )
    }

    // Mode solo après réponse
    if (!isMultiplayer && answered) {
      return (
        <div className="text-center bg-green-950/50 border border-green-800 rounded-lg p-3">
          <p className="text-green-300 text-sm">
            Réponse soumise ! Passage à la question suivante...
          </p>
        </div>
      )
    }

    return null
  }

  // Calculs des performances
  const currentPlayer = gameState?.players?.find(p => p.user.id === user?.id)
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0
  const position = gameState?.players?.findIndex(p => p.user.id === user?.id) + 1 || 1

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
        // Normalisation des données de questions pour gérer les différentes structures
        const questionData = currentQuestion.data || {}
        const options = questionData.options || questionData.answers || currentQuestion.options || []
        return (
          <div className="space-y-3">
            {options.map((option, index) => (
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
            {/* Left side - Timer and Leave button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                <span className={`text-xl font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-slate-200'}`}>
                  {timeLeft}s
                </span>
              </div>

              {/* Leave Game Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLeaveGame}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Leave
              </motion.button>
            </div>

            {/* Center - Progress */}
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Question {currentQuestionNumber}
              </span>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">{gameState.players?.length || 0}</span>
              </div>
            </div>

            {/* Right side - Score */}
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
                {currentQuestion.question || currentQuestion.text}
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

            {/* Reaction Bar - Only show during question, not during results */}
            {!showingResults && (
              <div className="mb-6">
                <ReactionBar
                  onReaction={handleReaction}
                  disabled={answered}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center">
              {renderActionButtons()}
            </div>

            {error && (
              <div className="mt-4 bg-red-950/50 border border-red-800 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Players Status - Masquer en mode solo */}
        {gameState?.players?.length > 1 && (
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
        )}
      </div>

      {/* Floating Reactions */}
      <FloatingReactions reactions={reactions} />

      {/* Micro Challenge */}
      {microChallenge && (
        <MicroChallenge
          challenge={microChallenge}
          onRespond={handleRespondToMicroChallenge}
          userHasResponded={microChallenge.responses.some(r => r.user.id === user?.id)}
          currentUserId={user?.id || ''}
        />
      )}

      {/* Performance Indicators */}
      <PerformanceIndicators
        timeLeft={timeLeft}
        totalTime={currentQuestion.timeLimit || 30}
        streak={currentPlayer?.streak || 0}
        accuracy={accuracy}
        averageResponseTime={averageResponseTime}
        currentScore={currentPlayer?.score || 0}
        position={position}
        totalPlayers={gameState.players?.length || 1}
      />

      {/* Celebration Effects */}
      {lastResult && (
        <CelebrationEffects
          isCorrect={lastResult.isCorrect}
          pointsEarned={lastResult.pointsEarned}
          streak={lastResult.streak}
          isNewLeader={position === 1 && gameState.players?.length > 1}
          trigger={showCelebration}
          onComplete={() => {
            setShowCelebration(false)
            setLastResult(null)
          }}
        />
      )}
    </div>
  )
}

export default GamePlay