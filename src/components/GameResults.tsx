'use client'

import React from 'react'
import { Trophy, Home, Star } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface GameResultsProps {
  onPlayAgain: () => void
  onBackToLobby: () => void
  results?: any
  score?: number
  totalQuestions?: number
}

const GameResults: React.FC<GameResultsProps> = ({ 
  onPlayAgain, 
  onBackToLobby, 
  score = 1250, 
  totalQuestions = 10 
}) => {
  const { user } = useAuth()
  
  const maxScore = totalQuestions * 200
  const percentage = Math.round((score / maxScore) * 100)
  const stars = Math.floor(percentage / 20)

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return "🎉 Extraordinaire !"
    if (percentage >= 75) return "🔥 Excellent !"
    if (percentage >= 60) return "👍 Bien joué !"
    if (percentage >= 40) return "💪 Pas mal !"
    return "📚 Continue à t'entraîner !"
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg border border-slate-700">
          <Trophy className="w-12 h-12 text-slate-300" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-100 mb-2">Game Complete!</h2>
        
        <div className="my-6">
          <span className="text-6xl">{user?.avatar}</span>
          <p className="text-xl font-semibold text-slate-100 mt-2">{user?.username}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
          <p className="text-4xl font-bold text-slate-100">
            {score}
          </p>
          <p className="text-slate-300 mt-2">Points</p>
          <div className="flex justify-center gap-1 mt-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-6 h-6 ${i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-400 mt-2">Performance: {percentage}%</p>
          <p className="text-lg text-slate-100 mt-2 font-semibold">
            {getPerformanceMessage(percentage)}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{totalQuestions}</p>
                <p className="text-xs text-slate-400">Questions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{Math.round(percentage)}%</p>
                <p className="text-xs text-slate-400">Réussite</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{score}</p>
                <p className="text-xs text-slate-400">Points</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            Rejouer
          </button>
          <button
            onClick={onBackToLobby}
            className="w-full py-3 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-2 border border-slate-700 rounded-lg hover:border-slate-600"
          >
            <Home className="w-4 h-4" />
            Menu principal
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameResults