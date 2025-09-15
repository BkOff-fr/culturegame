'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, Crown, Users, Zap, MessageCircle, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/context/GameContext'
import { useAuth } from '@/context/AuthContext'

interface GameRoomProps {
  onStartGame: () => void
  onLeaveGame: () => void
}

const GameRoom: React.FC<GameRoomProps> = ({ onStartGame, onLeaveGame }) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const { user } = useAuth()
  const {
    gameState,
    isHost,
    messages,
    loading,
    leaveGame,
    markReady,
    startGame,
    sendMessage,
    refreshGameState
  } = useGame()

  // Le polling est déjà géré par GameContext
  // Pas besoin de polling supplémentaire ici

  // Monitor game status changes
  useEffect(() => {
    if (gameState?.status === 'IN_PROGRESS') {
      onStartGame()
    }
  }, [gameState?.status, onStartGame])

  const handleCopyCode = async () => {
    if (!gameState?.roomCode) return

    try {
      await navigator.clipboard.writeText(gameState.roomCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleLeaveGame = async () => {
    if (!gameState?.roomCode) return

    try {
      await leaveGame(gameState.roomCode)
      onLeaveGame()
    } catch (error) {
      console.error('Failed to leave game:', error)
      setError('Failed to leave game')
    }
  }

  const handleMarkReady = async () => {
    if (!gameState?.roomCode) return

    try {
      await markReady(gameState.roomCode)
      setIsReady(true)
    } catch (error) {
      console.error('Failed to mark ready:', error)
      setError('Failed to mark ready')
    }
  }

  const handleStartGame = async () => {
    if (!gameState?.roomCode || !isHost) return

    setStarting(true)
    setError('')

    try {
      await startGame(gameState.roomCode)
    } catch (error) {
      console.error('Failed to start game:', error)
      setError('Failed to start game')
    } finally {
      setStarting(false)
    }
  }

  const handleSendMessage = async (message: string, type: 'PREDEFINED' | 'CUSTOM' = 'CUSTOM') => {
    if (!gameState?.roomCode) return

    try {
      await sendMessage(gameState.roomCode, message, type)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (!gameState || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    )
  }

  const readyPlayers = gameState.players?.filter(p => p.isReady) || []
  const totalPlayers = gameState.players?.length || 0
  // En mode solo (1 joueur), on peut démarrer directement. En mode multijoueur, tous doivent être prêts
  const canStart = isHost && totalPlayers >= 1 && (totalPlayers === 1 || readyPlayers.length === totalPlayers)

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleLeaveGame}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Leave game"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100 mb-2">Game Room</h2>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-3xl font-mono text-slate-200 bg-slate-800 px-4 py-2 rounded-lg">
                  {gameState.roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Copy room code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Players */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-200">
                Players ({totalPlayers})
              </h3>
            </div>

            <div className="grid gap-3">
              {gameState.players?.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center">
                      {player.user.avatar || player.user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">{player.user.username}</span>
                        {gameState?.host?.id && player?.user?.id && gameState.host.id === player.user.id && (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-400">
                        {player.isReady ? 'Ready' : 'Not ready'}
                      </span>
                    </div>
                  </div>

                  <div className={`w-3 h-3 rounded-full ${
                    player.isReady ? 'bg-green-400' : 'bg-slate-600'
                  }`} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {!isReady && totalPlayers > 1 && (
              <button
                onClick={handleMarkReady}
                disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                {loading ? 'Marking Ready...' : 'Ready'}
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStart || starting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                {starting ? 'Starting...' : `Start Game ${canStart ? '' : `(${readyPlayers.length}/${totalPlayers} ready)`}`}
              </button>
            )}

            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-3">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Chat (if enabled) */}
          {showChat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 bg-slate-800/30 rounded-lg p-4 border border-slate-700"
            >
              <h4 className="text-slate-200 font-medium mb-3">Chat</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span className="text-slate-400">{msg.username}:</span>
                    <span className="text-slate-200 ml-2">{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSendMessage('🎉', 'PREDEFINED')}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors"
                >
                  🎉
                </button>
                <button
                  onClick={() => handleSendMessage('👍', 'PREDEFINED')}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors"
                >
                  👍
                </button>
                <button
                  onClick={() => handleSendMessage('Ready!', 'PREDEFINED')}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm transition-colors"
                >
                  Ready!
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameRoom