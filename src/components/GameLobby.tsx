'use client'

import React, { useState } from 'react'
import { Users, Zap, Edit3, LogOut, Trophy, BarChart3 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSocket } from '@/context/SocketContext'

interface GameLobbyProps {
  onCreateRoom: () => void
  onJoinRoom: (roomCode: string) => Promise<void>
  onOpenEditor: () => void
  onStartSolo: () => void
  onOpenLeaderboard: () => void
  onOpenAnalytics: () => void
}

const GameLobby: React.FC<GameLobbyProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenEditor,
  onStartSolo,
  onOpenLeaderboard,
  onOpenAnalytics
}) => {
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { user, logout } = useAuth()
  const { disconnect } = useSocket()

  const handleCreateRoom = async () => {
    onCreateRoom()
  }

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return

    setLoading(true)
    setError('')
    try {
      await onJoinRoom(joinCode.trim().toUpperCase())
      setJoinCode('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...')

      // Disconnect from Socket.io first
      disconnect()

      // Then logout from auth
      await logout()

      console.log('Logout process completed')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center text-2xl mb-4 mx-auto shadow-lg border border-slate-700">
              {user.avatar}
            </div>
            <h2 className="text-2xl font-semibold text-slate-100 mb-1">
              Welcome back, {user.username}
            </h2>
            <p className="text-slate-400 text-sm">Ready to challenge your knowledge?</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Main Actions */}
        <div className="space-y-3 mb-6">
          <button
            onClick={onStartSolo}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700 hover:border-slate-600"
          >
            <Zap className="w-4 h-4" />
            Solo Practice
          </button>

          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            <Users className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={onOpenEditor}
            className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors border border-slate-700"
          >
            <Edit3 className="w-3 h-3" />
            Editor
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors border border-slate-700"
          >
            <Trophy className="w-3 h-3" />
            Rankings
          </button>

          <button
            onClick={onOpenAnalytics}
            className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors border border-slate-700"
          >
            <BarChart3 className="w-3 h-3" />
            Analytics
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-950 px-3 text-slate-500 uppercase tracking-wider">Or Join Game</span>
          </div>
        </div>

        {/* Join Room */}
        <div className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none transition-colors uppercase font-mono text-center"
            placeholder="GAME CODE"
            maxLength={6}
          />
          <button
            onClick={handleJoinRoom}
            disabled={!joinCode.trim() || loading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600"
          >
            {loading ? (
              <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Join'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-950/50 border border-red-800 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameLobby