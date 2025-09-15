'use client'

import React, { useState, useEffect } from 'react'
import { Copy, Check, Crown, Users, Zap, MessageCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocketGame } from '@/hooks/useSocketGame'
import { useAuth } from '@/context/AuthContext'
import { PREDEFINED_MESSAGES } from '@/types/game'

interface GameRoomSocketProps {
  onStartGame: () => void
  onLeaveGame: () => void
}

const GameRoomSocket: React.FC<GameRoomSocketProps> = ({ onStartGame, onLeaveGame }) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const { user } = useAuth()
  const {
    connected,
    gameState,
    isHost,
    messages,
    connectToGame,
    leaveGameRoom,
    markPlayerReady,
    startGameSession,
    sendGameMessage
  } = useSocketGame()

  // Auto-connect to socket when component mounts
  useEffect(() => {
    if (!connected) {
      connectToGame()
    }
  }, [connected, connectToGame])

  const copyRoomCode = async () => {
    if (!gameState?.roomCode) return

    try {
      await navigator.clipboard.writeText(gameState.roomCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (error) {
      console.error('Failed to copy room code:', error)
    }
  }

  const handleLeaveGame = () => {
    leaveGameRoom()
    onLeaveGame()
  }

  const handleToggleReady = () => {
    if (!isReady) {
      markPlayerReady()
      setIsReady(true)
    }
  }

  const handleStartGame = async () => {
    if (!gameState || !isHost) return

    setStarting(true)
    setError('')

    try {
      // Vérifier que tous les joueurs sont prêts
      const allPlayersReady = gameState.players.every((player: any) =>
        player.isReady || player.isHost
      )

      if (!allPlayersReady) {
        setError('Tous les joueurs doivent être prêts avant de commencer')
        return
      }

      startGameSession()
      onStartGame()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStarting(false)
    }
  }

  const handleSendMessage = (message: string) => {
    sendGameMessage(message, 'PREDEFINED')
  }

  // Affichage de chargement si pas de gameState
  if (!gameState || !connected) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Connexion à la partie...</div>
          <div className="text-slate-400 text-sm mt-2">
            {connected ? 'Synchronisation en cours...' : 'Connexion au serveur...'}
          </div>
        </div>
      </div>
    )
  }

  const currentPlayer = gameState.players.find((p: any) => p.userId === user?.id)
  const allPlayersReady = gameState.players.every((p: any) => p.isReady || p.isHost)
  const canStartGame = isHost && allPlayersReady && gameState.players.length > 0

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8 max-w-lg w-full relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6">
            Game Lobby
            {connected && (
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full ml-3"></span>
            )}
          </h2>

          {/* Room Code */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <p className="text-sm text-slate-400 mb-3">Room Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold text-slate-100 tracking-widest">
                {gameState.roomCode}
              </span>
              <button
                onClick={copyRoomCode}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors border border-slate-600"
                title="Copy code"
              >
                {copiedCode ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-slate-400" />
                )}
              </button>
            </div>
            {copiedCode && (
              <p className="text-green-400 text-sm mt-2">Code copied to clipboard!</p>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">
              Players ({gameState.players.length}/{gameState.settings?.maxPlayers || 8})
            </p>
            <div className="flex gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <button
                onClick={() => setShowChat(!showChat)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Toggle chat"
              >
                <MessageCircle className="w-4 h-4" />
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {messages.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {gameState.players.map((player: any, index: number) => (
                <motion.div
                  key={player.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 bg-slate-800/30 border rounded-lg p-3 ${
                    player.isReady ? 'border-green-600/50 bg-green-900/10' : 'border-slate-700'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-lg">
                      {player.avatar}
                    </div>
                    {player.isReady && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-100">
                        {player.username}
                      </span>
                      {player.userId === user?.id && (
                        <span className="text-xs text-blue-400">(You)</span>
                      )}
                    </div>
                    {player.isReady ? (
                      <div className="text-xs text-green-400">Ready!</div>
                    ) : (
                      <div className="text-xs text-slate-500">Waiting...</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {player.userId === gameState.hostId && (
                      <div className="flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                        <Crown className="w-3 h-3" />
                        Host
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>

        {/* Chat Messages */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-slate-800/50 border border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300">Quick Chat</h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  ×
                </button>
              </div>

              {/* Recent messages */}
              {messages.length > 0 && (
                <div className="mb-3 space-y-1 max-h-24 overflow-y-auto text-sm">
                  {messages.slice(-3).map((msg, index) => (
                    <div key={index} className="text-slate-400">
                      <span className="font-medium text-slate-300">{msg.username}:</span> {msg.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Predefined messages */}
              <div className="grid grid-cols-2 gap-2">
                {PREDEFINED_MESSAGES.slice(0, 6).map((message, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(message)}
                    className="text-xs py-1 px-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                  >
                    {message}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ready Status & Game Controls */}
        <div className="space-y-3">
          {/* Ready Button (for non-hosts) */}
          {!isHost && currentPlayer && !currentPlayer.isReady && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleReady}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-600/20"
            >
              <Zap className="w-4 h-4" />
              Mark as Ready
            </motion.button>
          )}

          {/* Start Game Button (for host) */}
          {isHost ? (
            <motion.button
              whileHover={canStartGame ? { scale: 1.02 } : undefined}
              whileTap={canStartGame ? { scale: 0.98 } : undefined}
              onClick={handleStartGame}
              disabled={!canStartGame || starting}
              className={`w-full py-3 rounded-lg font-medium transition-colors shadow-lg ${
                canStartGame
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {starting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                  Starting Game...
                </div>
              ) : canStartGame ? (
                'Start Game'
              ) : (
                `Waiting for players to be ready (${gameState.players.filter((p: any) => p.isReady || p.isHost).length}/${gameState.players.length})`
              )}
            </motion.button>
          ) : (
            <div className="w-full py-3 bg-slate-700 text-slate-300 rounded-lg font-medium text-center border border-slate-600">
              {allPlayersReady
                ? 'All players ready! Waiting for host to start...'
                : 'Waiting for all players to be ready...'
              }
            </div>
          )}

          {/* Leave Game Button */}
          <button
            onClick={handleLeaveGame}
            className="w-full py-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Leave Game
          </button>
        </div>

        {/* Game Status */}
        <div className="mt-4 p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Status:</span>
            <span className="text-slate-300 capitalize">{gameState.status.toLowerCase().replace('_', ' ')}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-slate-400">Connection:</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-slate-300">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-red-950/50 border border-red-800 rounded-lg p-3"
          >
            <p className="text-red-300 text-sm">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default GameRoomSocket