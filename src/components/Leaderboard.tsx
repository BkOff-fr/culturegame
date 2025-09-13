'use client'

import React, { useState, useEffect } from 'react'
import { Trophy, Medal, Award, TrendingUp, X, Crown, Star, Zap, Target, Clock, Percent } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface LeaderboardProps {
  onClose: () => void
}

interface PlayerStats {
  rank: number
  user: {
    id: string
    username: string
    avatar: string
  }
  totalScore: number
  gamesPlayed: number
  averageScore: number
}

interface UserStats {
  totalGames: number
  totalScore: number
  averageScore: number
  bestScore: number
  accuracyRate: number
  correctAnswers: number
  totalAnswers: number
  averageResponseTime: number
  maxStreak: number
  rank: number
  recentGames: Array<{
    score: number
    streak: number
    endedAt: string
  }>
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'stats'>('leaderboard')
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Charger le classement
      const leaderboardResponse = await fetch('/api/leaderboard?limit=20', {
        credentials: 'include'
      })
      if (leaderboardResponse.ok) {
        const data = await leaderboardResponse.json()
        setLeaderboard(data.leaderboard)
      }

      // Charger les stats utilisateur
      const statsResponse = await fetch('/api/stats', {
        credentials: 'include'
      })
      if (statsResponse.ok) {
        const data = await statsResponse.json()
        setUserStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Award className="w-6 h-6 text-orange-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-slate-400 font-bold">#{rank}</span>
    }
  }

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/50'
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-300/50'
      case 3:
        return 'bg-gradient-to-r from-orange-400/20 to-red-500/20 border-orange-400/50'
      default:
        return 'bg-slate-800/30 border-slate-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-300 text-xl">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="max-w-6xl mx-auto relative">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
                <Trophy className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Leaderboard & Statistics</h2>
                <p className="text-slate-400 text-sm">Track your performance and compete with others</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Onglets */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              🏆 Classement
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              📊 Mes Stats
            </button>
          </div>

          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-100 mb-4">Top Players</h3>
              
              {leaderboard.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  Aucun classement disponible. Soyez le premier à jouer !
                </p>
              ) : (
                leaderboard.map((player) => (
                  <div
                    key={player.user.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${getRankStyle(player.rank)} ${
                      player.user.id === user?.id ? 'ring-2 ring-blue-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getRankIcon(player.rank)}
                      <span className="text-3xl">{player.user.avatar}</span>
                      <div>
                        <p className="font-bold text-slate-100">{player.user.username}</p>
                        <p className="text-sm text-slate-400">{player.gamesPlayed} parties</p>
                      </div>
                    </div>
                    
                    <div className="ml-auto text-right">
                      <p className="text-2xl font-bold text-blue-400">{player.totalScore.toLocaleString()}</p>
                      <p className="text-sm text-slate-400">Moy: {player.averageScore}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'stats' && userStats && (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Stats générales */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  Statistiques Générales
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-slate-400">Parties Jouées</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-100">{userStats.totalGames}</p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <span className="text-sm text-slate-400">Score Total</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-100">{userStats.totalScore.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-slate-400">Meilleur Score</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-100">{userStats.bestScore}</p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-slate-400">Rang Global</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-100">#{userStats.rank}</p>
                  </div>
                </div>
              </div>

              {/* Stats de performance */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-purple-400" />
                  Performance
                </h3>
                
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Percent className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-slate-400">Taux de Réussite</span>
                      </div>
                      <span className="text-xl font-bold text-slate-100">{userStats.accuracyRate}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${userStats.accuracyRate}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-slate-400">Temps Moyen de Réponse</span>
                    </div>
                    <p className="text-xl font-bold text-slate-100">{userStats.averageResponseTime}s</p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-slate-400">Meilleur Streak</span>
                    </div>
                    <p className="text-xl font-bold text-slate-100">{userStats.maxStreak} combos</p>
                  </div>
                  
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-indigo-400" />
                      <span className="text-sm text-slate-400">Questions Réussies</span>
                    </div>
                    <p className="text-xl font-bold text-slate-100">
                      {userStats.correctAnswers} / {userStats.totalAnswers}
                    </p>
                  </div>
                </div>
              </div>

              {/* Historique récent */}
              {userStats.recentGames.length > 0 && (
                <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Games</h3>
                  <div className="grid md:grid-cols-5 gap-4">
                    {userStats.recentGames.map((game, index) => (
                      <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <p className="text-lg font-bold text-blue-400">{game.score} pts</p>
                        <p className="text-sm text-slate-400">{game.streak} combo</p>
                        <p className="text-xs text-slate-500">
                          {new Date(game.endedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard