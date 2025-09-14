'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Volume2, VolumeX, Zap } from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { useAuth } from '@/context/AuthContext'

interface GamePlayProps {
  onGameEnd: () => void
}

const GamePlay: React.FC<GamePlayProps> = ({ onGameEnd }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null)
  const [textAnswer, setTextAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const { questions, loadQuestions } = useGame()
  const { user } = useAuth()

  // Charger les questions au démarrage
  useEffect(() => {
    loadQuestions({ isPublic: true, limit: 20 })
  }, [])

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !showResult && questions.length > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult) {
      handleAnswer(null)
    }
  }, [timeLeft, showResult, questions.length])

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement des questions...</div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const handleAnswer = (answer: any) => {
    let isCorrect = false

    // Logique de vérification des réponses selon le type de question
    switch (currentQuestion.type) {
      case 'MULTIPLE_CHOICE':
        isCorrect = answer === currentQuestion.data.correct
        break
      case 'TRUE_FALSE':
        isCorrect = answer === currentQuestion.data.correct
        break
      case 'TEXT_INPUT':
        isCorrect = currentQuestion.data.correct.some((correctAnswer: string) => 
          textAnswer.toLowerCase().trim() === correctAnswer.toLowerCase()
        )
        break
      default:
        isCorrect = false
    }

    setShowResult(true)
    
    if (isCorrect) {
      const bonusPoints = Math.round((timeLeft / currentQuestion.timeLimit) * 50)
      const streakBonus = streak * 10
      const totalPoints = currentQuestion.points + bonusPoints + streakBonus
      setScore(score + totalPoints)
      setStreak(streak + 1)
    } else {
      setStreak(0)
    }

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setSelectedAnswer(null)
        setTextAnswer('')
        setShowResult(false)
        setTimeLeft(questions[currentQuestionIndex + 1].timeLimit)
      } else {
        onGameEnd()
      }
    }, 2000)
  }

  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="grid grid-cols-2 gap-4">
            {currentQuestion.data.answers.map((answer: string, index: number) => (
              <button
                key={index}
                onClick={() => !showResult && handleAnswer(index)}
                disabled={showResult}
                className={`p-4 rounded-xl font-medium transition-all transform hover:scale-105 ${
                  showResult
                    ? index === currentQuestion.data.correct
                      ? 'bg-green-500 text-white animate-pulse'
                      : selectedAnswer === index
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10 text-gray-400 border border-white/20'
                    : 'bg-white/10 border border-white/20 hover:bg-white/20 text-white'
                }`}
              >
                {answer}
              </button>
            ))}
          </div>
        )

      case 'TRUE_FALSE':
        return (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => !showResult && handleAnswer(true)}
              disabled={showResult}
              className={`p-8 rounded-xl font-bold text-2xl transition-all transform hover:scale-105 ${
                showResult
                  ? currentQuestion.data.correct === true
                    ? 'bg-green-500 text-white animate-pulse'
                    : selectedAnswer === true
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-gray-400 border border-white/20'
                  : 'bg-white/10 border border-white/20 hover:bg-white/20 text-white'
              }`}
            >
              ✅ VRAI
            </button>
            <button
              onClick={() => !showResult && handleAnswer(false)}
              disabled={showResult}
              className={`p-8 rounded-xl font-bold text-2xl transition-all transform hover:scale-105 ${
                showResult
                  ? currentQuestion.data.correct === false
                    ? 'bg-green-500 text-white animate-pulse'
                    : selectedAnswer === false
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-gray-400 border border-white/20'
                  : 'bg-white/10 border border-white/20 hover:bg-white/20 text-white'
              }`}
            >
              ❌ FAUX
            </button>
          </div>
        )

      case 'TEXT_INPUT':
        return (
          <div className="space-y-4">
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !showResult && handleAnswer(null)}
              className="w-full px-6 py-4 text-xl rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none transition-colors"
              placeholder="Tapez votre réponse..."
              disabled={showResult}
            />
            <button
              onClick={() => handleAnswer(null)}
              disabled={showResult || !textAnswer.trim()}
              className="w-full py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Valider
            </button>
            {showResult && (
              <p className="text-center text-green-400">
                Réponse correcte : {currentQuestion.data.correct[0]}
              </p>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center text-gray-400">
            Type de question non supporté
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{user?.avatar}</span>
            <div>
              <p className="font-semibold text-white">{user?.username}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-300">Score: {score}</p>
                {streak > 0 && (
                  <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {streak}x combo
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-gray-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 border border-white/20">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className={`font-bold text-lg ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              Question {currentQuestionIndex + 1}/{questions.length}
            </span>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-medium">
              {currentQuestion.category}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white text-center">
            {currentQuestion.question}
          </h3>
        </div>

        {renderQuestion()}
      </div>
    </div>
  )
}

export default GamePlay