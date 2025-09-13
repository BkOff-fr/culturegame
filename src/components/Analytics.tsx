'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, BarChart3, TrendingUp, TrendingDown, Users, Clock, Target, 
  Award, Zap, Brain, Calendar, Filter, Download, RefreshCw
} from 'lucide-react'

interface AnalyticsProps {
  onClose: () => void
}

interface AnalyticsData {
  overview: {
    totalGames: number
    totalPlayers: number
    avgSessionTime: number
    popularCategories: Array<{ name: string, count: number }>
  }
  performance: {
    avgAccuracy: number
    avgResponseTime: number
    difficultyBreakdown: Array<{ difficulty: string, accuracy: number, count: number }>
    categoryPerformance: Array<{ category: string, accuracy: number, avgScore: number }>
  }
  trends: {
    dailyGames: Array<{ date: string, games: number, players: number }>
    weeklyStats: Array<{ week: string, avgScore: number, totalQuestions: number }>
  }
}

const Analytics: React.FC<AnalyticsProps> = ({ onClose }) => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange, selectedCategory])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // Simuler des données analytiques
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setData({
        overview: {
          totalGames: 1247,
          totalPlayers: 543,
          avgSessionTime: 8.5,
          popularCategories: [
            { name: 'Sciences', count: 324 },
            { name: 'Histoire', count: 298 },
            { name: 'Géographie', count: 276 },
            { name: 'Littérature', count: 201 },
            { name: 'Art', count: 148 }
          ]
        },
        performance: {
          avgAccuracy: 73.2,
          avgResponseTime: 12.8,
          difficultyBreakdown: [
            { difficulty: 'EASY', accuracy: 84.3, count: 456 },
            { difficulty: 'MEDIUM', accuracy: 71.7, count: 612 },
            { difficulty: 'HARD', accuracy: 58.9, count: 289 }
          ],
          categoryPerformance: [
            { category: 'Sciences', accuracy: 68.4, avgScore: 142 },
            { category: 'Histoire', accuracy: 75.1, avgScore: 156 },
            { category: 'Géographie', accuracy: 79.3, avgScore: 168 },
            { category: 'Littérature', accuracy: 71.2, avgScore: 149 },
            { category: 'Art', accuracy: 66.8, avgScore: 138 }
          ]
        },
        trends: {
          dailyGames: [
            { date: '2024-01-01', games: 45, players: 123 },
            { date: '2024-01-02', games: 52, players: 134 },
            { date: '2024-01-03', games: 38, players: 98 },
            { date: '2024-01-04', games: 61, players: 156 },
            { date: '2024-01-05', games: 48, players: 118 },
            { date: '2024-01-06', games: 55, players: 142 },
            { date: '2024-01-07', games: 67, players: 178 }
          ],
          weeklyStats: [
            { week: 'W1', avgScore: 145, totalQuestions: 1234 },
            { week: 'W2', avgScore: 152, totalQuestions: 1456 },
            { week: 'W3', avgScore: 148, totalQuestions: 1378 },
            { week: 'W4', avgScore: 161, totalQuestions: 1598 }
          ]
        }
      })
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-300">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Loading analytics...
        </div>
      </div>
    )
  }

  if (!data) return null

  const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-700 rounded-lg">
          <Icon className="w-5 h-5 text-slate-300" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {trendValue}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-slate-100 mb-1">{value}</h3>
      <p className="text-sm text-slate-400">{title}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="max-w-7xl mx-auto relative">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl">
                <BarChart3 className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Analytics Dashboard</h2>
                <p className="text-slate-400 text-sm">Comprehensive game performance insights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Games Played"
              value={data.overview.totalGames.toLocaleString()}
              icon={Target}
              trend="up"
              trendValue="12.3"
            />
            <StatCard
              title="Active Players"
              value={data.overview.totalPlayers.toLocaleString()}
              icon={Users}
              trend="up"
              trendValue="8.7"
            />
            <StatCard
              title="Avg Session Time"
              value={`${data.overview.avgSessionTime} min`}
              icon={Clock}
              trend="down"
              trendValue="2.1"
            />
            <StatCard
              title="Avg Accuracy"
              value={`${data.performance.avgAccuracy}%`}
              icon={Award}
              trend="up"
              trendValue="5.2"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Performance Breakdown */}
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Performance by Difficulty
                </h3>
                <div className="space-y-4">
                  {data.performance.difficultyBreakdown.map((item) => (
                    <div key={item.difficulty} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm font-medium capitalize">
                          {item.difficulty.toLowerCase()}
                        </span>
                        <span className="text-slate-100 font-semibold">{item.accuracy}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            item.difficulty === 'EASY' ? 'bg-green-500' :
                            item.difficulty === 'MEDIUM' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.accuracy}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">{item.count} games</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Category Performance
                </h3>
                <div className="space-y-3">
                  {data.performance.categoryPerformance.map((item) => (
                    <div key={item.category} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div>
                        <p className="text-slate-100 font-medium">{item.category}</p>
                        <p className="text-xs text-slate-400">Avg Score: {item.avgScore}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-100 font-semibold">{item.accuracy}%</p>
                        <p className="text-xs text-slate-400">accuracy</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className="space-y-6">
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Popular Categories
                </h3>
                <div className="space-y-3">
                  {data.overview.popularCategories.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-slate-700 rounded-lg text-xs font-bold text-slate-300">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-100 font-medium">{item.name}</p>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all duration-1000"
                            style={{ width: `${(item.count / data.overview.popularCategories[0].count) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-slate-400 text-sm">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Weekly Trends
                </h3>
                <div className="space-y-4">
                  {data.trends.weeklyStats.map((item) => (
                    <div key={item.week} className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">{item.week}</span>
                      <div className="text-right">
                        <p className="text-slate-100 font-semibold">{item.avgScore} pts</p>
                        <p className="text-xs text-slate-400">{item.totalQuestions} questions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">
                Data updated in real-time • Last refresh: {new Date().toLocaleTimeString()}
              </p>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700">
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button 
                  onClick={loadAnalytics}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics