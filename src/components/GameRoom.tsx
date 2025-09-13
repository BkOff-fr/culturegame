'use client'

import React, { useState } from 'react'
import { Copy, Check, Crown, Users } from 'lucide-react'
import { useGame } from '@/context/GameContext'
import { useAuth } from '@/hooks/useAuth'

interface GameRoomProps {
  onStartGame: () => void
  onLeaveGame: () => void
}

const GameRoom: React.FC<GameRoomProps> = ({ onStartGame, onLeaveGame }) => {
  const [copiedCode, setCopiedCode] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const { currentGame, leaveGame, startGame } = useGame()
  const { user } = useAuth()
  
  console.log('GameRoom - currentGame:', currentGame)
  console.log('GameRoom - user:', user)

  const copyRoomCode = async () => {
    if (!currentGame?.roomCode) return
    
    try {
      await navigator.clipboard.writeText(currentGame.roomCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (error) {
      console.error('Failed to copy room code:', error)
    }
  }

  const handleLeaveGame = () => {
    leaveGame()
    onLeaveGame()
  }

  const handleStartGame = async () => {
    if (!currentGame || !isHost) return
    
    setStarting(true)
    setError('')
    try {
      await startGame(currentGame.id)
      onStartGame()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStarting(false)
    }
  }

  // L'hôte est la personne qui a créé la partie (pas forcément le premier joueur)
  const isHost = currentGame && user && currentGame.hostId === user.id
  
  console.log('GameRoom - Host detection debug:')
  console.log('- currentGame:', currentGame)
  console.log('- user:', user)
  console.log('- currentGame.hostId:', currentGame?.hostId)
  console.log('- user.id:', user?.id)
  console.log('- isHost result:', isHost)

  if (!currentGame) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement de la partie...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl shadow-2xl p-8 max-w-lg w-full relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-6">Game Lobby</h2>
          
          {/* Room Code */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <p className="text-sm text-slate-400 mb-3">Room Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold text-slate-100 tracking-widest">
                {currentGame.roomCode}
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
              Players ({currentGame.players.length}/{(currentGame.settings as any)?.maxPlayers || 4})
            </p>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          
          <div className="space-y-2">
            {currentGame.players.map((player) => (
              <div 
                key={player.id} 
                className="flex items-center gap-3 bg-slate-800/30 border border-slate-700 rounded-lg p-3"
              >
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-lg">
                  {player.user.avatar}
                </div>
                <span className="font-medium text-slate-100 flex-1">
                  {player.user.username}
                </span>
                {player.user.id === currentGame.hostId && (
                  <div className="flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                    <Crown className="w-3 h-3" />
                    Host
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Game Controls */}
        <div className="space-y-3">
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={currentGame.players.length < 1 || starting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {starting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
                  Starting Game...
                </div>
              ) : (
                'Start Game'
              )}
            </button>
          ) : (
            <div className="w-full py-3 bg-slate-700 text-slate-300 rounded-lg font-medium text-center border border-slate-600">
              Waiting for host to start the game...
            </div>
          )}

          <button
            onClick={handleLeaveGame}
            className="w-full py-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            Leave Game
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

export default GameRoom