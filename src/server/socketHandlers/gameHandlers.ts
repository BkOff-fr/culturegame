import type { Server, Socket } from 'socket.io'
import { gameStateManager } from '@/lib/redis'
import { DatabaseUtils, prisma } from '@/lib/db'

// Rate limiting per user
const userRateLimiter = new Map<string, { count: number; resetTime: number }>()

const rateLimitByUser = (socket: Socket, maxRequests = 10, windowMs = 1000): boolean => {
  const userId = socket.userId
  const now = Date.now()

  let userLimit = userRateLimiter.get(userId)

  if (!userLimit || now > userLimit.resetTime) {
    userLimit = { count: 0, resetTime: now + windowMs }
    userRateLimiter.set(userId, userLimit)
  }

  if (userLimit.count >= maxRequests) {
    socket.emit('rate-limit-exceeded', {
      message: 'Too many requests, please slow down'
    })
    return false
  }

  userLimit.count++
  return true
}

// Game state synchronization class
class GameStateSync {
  private io: Server

  constructor(io: Server) {
    this.io = io
  }

  async broadcastGameState(gameId: string, roomCode: string, gameState: any) {
    this.io.to(roomCode).emit('game-state-update', {
      gameId,
      state: gameState,
      timestamp: Date.now(),
      version: gameState.version || 1
    })

    // Persist critical state changes to Redis
    await gameStateManager.setGameRoom(gameId, gameState)
  }

  async updateRoomActivity(gameId: string) {
    await gameStateManager.updateRoomActivity(gameId)
  }
}

// Enhanced game room management
class GameRoomManager {
  private gameRooms = new Map<string, any>()
  private gameStateSync: GameStateSync

  constructor(io: Server) {
    this.gameStateSync = new GameStateSync(io)
  }

  async getOrCreateRoom(gameId: string): Promise<any> {
    let room = this.gameRooms.get(gameId)

    if (!room) {
      // Try to restore from Redis first
      room = await gameStateManager.getGameRoom(gameId)

      if (!room) {
        // Create new room from database
        const game = await prisma.game.findUnique({
          where: { id: gameId },
          include: {
            players: {
              include: {
                user: {
                  select: { id: true, username: true, avatar: true }
                }
              }
            }
          }
        })

        if (!game) throw new Error('Game not found')

        room = {
          id: game.id,
          roomCode: game.roomCode,
          hostId: game.hostId,
          players: new Map(),
          currentQuestion: null,
          currentQuestionIndex: game.currentQuestionIndex || 0,
          questions: [],
          status: game.status,
          settings: game.settings,
          answers: new Map(),
          lastActivity: Date.now(),
          version: 1
        }

        // Load questions
        const gameQuestions = await prisma.gameQuestion.findMany({
          where: { gameId: game.id },
          include: { question: true },
          orderBy: { order: 'asc' }
        })
        room.questions = gameQuestions.map(gq => gq.question)
      }

      this.gameRooms.set(gameId, room)
    }

    return room
  }

  getRoom(gameId: string): any | null {
    return this.gameRooms.get(gameId)
  }

  async updateRoom(gameId: string, updates: Partial<any>) {
    const room = this.gameRooms.get(gameId)
    if (!room) return null

    Object.assign(room, updates)
    room.lastActivity = Date.now()
    room.version = (room.version || 1) + 1

    // Update in Redis
    await gameStateManager.setGameRoom(gameId, room)

    return room
  }

  async removeRoom(gameId: string) {
    this.gameRooms.delete(gameId)
    await gameStateManager.removeGameRoom(gameId)
  }

  getAllRooms(): Map<string, any> {
    return this.gameRooms
  }

  async broadcastToRoom(roomCode: string, gameId: string, room: any) {
    await this.gameStateSync.broadcastGameState(gameId, roomCode, room)
  }
}

export class GameSocketHandlers {
  private io: Server
  private roomManager: GameRoomManager

  constructor(io: Server) {
    this.io = io
    this.roomManager = new GameRoomManager(io)
  }

  setupHandlers(socket: Socket) {
    // Enhanced connection tracking
    this.trackConnection(socket)

    socket.on('join-game', this.handleJoinGame.bind(this, socket))
    socket.on('leave-game', this.handleLeaveGame.bind(this, socket))
    socket.on('player-ready', this.handlePlayerReady.bind(this, socket))
    socket.on('start-game', this.handleStartGame.bind(this, socket))
    socket.on('submit-answer', this.handleSubmitAnswer.bind(this, socket))
    socket.on('use-powerup', this.handleUsePowerup.bind(this, socket))
    socket.on('send-message', this.handleSendMessage.bind(this, socket))

    // Enhanced disconnect handling
    socket.on('disconnect', this.handleDisconnect.bind(this, socket))
  }

  private async trackConnection(socket: Socket) {
    try {
      const userAgent = socket.handshake.headers['user-agent'] || ''
      const ipAddress = socket.handshake.address || ''

      await DatabaseUtils.trackConnection(
        socket.userId,
        socket.id,
        undefined, // gameId will be set when joining a game
        userAgent,
        ipAddress
      )
    } catch (error) {
      console.error('Failed to track connection:', error)
    }
  }

  private async handleJoinGame(socket: Socket, data: { roomCode: string; recovery?: boolean }) {
    try {
      if (!rateLimitByUser(socket, 5, 1000)) return

      const { roomCode, recovery } = data
      const user = socket.user

      const game = await prisma.game.findUnique({
        where: { roomCode },
        include: {
          players: {
            include: {
              user: {
                select: { id: true, username: true, avatar: true }
              }
            }
          }
        }
      })

      if (!game) {
        socket.emit('error', { message: 'Partie non trouvée' })
        return
      }

      if (game.status === 'FINISHED') {
        socket.emit('error', { message: 'Cette partie est terminée' })
        return
      }

      const room = await this.roomManager.getOrCreateRoom(game.id)
      const isHost = user.id === game.hostId
      const playerExists = game.players.some(p => p.userId === user.id)

      if (!playerExists && game.status !== 'WAITING') {
        socket.emit('error', { message: 'Impossible de rejoindre une partie en cours' })
        return
      }

      const existingPlayer = room.players.get(user.id)

      room.players.set(user.id, {
        id: user.id,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        score: existingPlayer?.score || game.players.find(p => p.userId === user.id)?.score || 0,
        isHost,
        isReady: existingPlayer?.isReady || false,
        socketId: socket.id,
        isConnected: true
      })

      // Update connection with gameId
      await DatabaseUtils.trackConnection(
        socket.userId,
        socket.id,
        game.id
      )

      // Handle reconnection
      if (existingPlayer && !existingPlayer.isConnected) {
        console.log(`${user.username} reconnected to game ${roomCode}`)
        socket.to(roomCode).emit('player-reconnected', {
          playerId: user.id,
          username: user.username
        })
      }

      socket.join(roomCode)

      const playersArray = Array.from(room.players.values())
      await this.roomManager.broadcastToRoom(roomCode, game.id, {
        ...room,
        players: playersArray
      })

      socket.emit('joined-game', {
        gameId: room.id,
        isHost,
        player: room.players.get(user.id),
        recovery: !!recovery
      })

      console.log(`${user.username} joined game ${roomCode} as ${isHost ? 'HOST' : 'PLAYER'}`)

      // Update room activity
      await gameStateManager.updateRoomActivity(game.id)

    } catch (error) {
      this.handleSocketError(socket, error, 'join-game')
    }
  }

  private async handleLeaveGame(socket: Socket, data: { roomCode: string }) {
    try {
      const { roomCode } = data
      const user = socket.user

      socket.leave(roomCode)

      const room = Array.from(this.roomManager.getAllRooms().values())
        .find(r => r.roomCode === roomCode)

      if (room) {
        room.players.delete(user.id)

        const playersArray = Array.from(room.players.values())
        socket.to(roomCode).emit('player-left', {
          playerId: user.id,
          players: playersArray
        })

        console.log(`${user.username} left game ${roomCode}`)
        await gameStateManager.updateRoomActivity(room.id)
      }

      // Remove connection tracking
      await DatabaseUtils.removeConnection(socket.id)

    } catch (error) {
      this.handleSocketError(socket, error, 'leave-game')
    }
  }

  private async handlePlayerReady(socket: Socket, data: { roomCode: string }) {
    try {
      const { roomCode } = data
      const user = socket.user

      const room = Array.from(this.roomManager.getAllRooms().values())
        .find(r => r.roomCode === roomCode)

      if (room) {
        const player = room.players.get(user.id)
        if (player) {
          player.isReady = true

          await this.roomManager.broadcastToRoom(roomCode, room.id, room)
          await gameStateManager.updateRoomActivity(room.id)
        }
      }
    } catch (error) {
      this.handleSocketError(socket, error, 'player-ready')
    }
  }

  private async handleStartGame(socket: Socket, data: { roomCode: string }) {
    try {
      if (!rateLimitByUser(socket, 1, 5000)) return // 1 start per 5 seconds

      const { roomCode } = data
      const user = socket.user

      const room = Array.from(this.roomManager.getAllRooms().values())
        .find(r => r.roomCode === roomCode)

      if (!room || room.hostId !== user.id) {
        socket.emit('error', { message: 'Seul l\'hôte peut démarrer la partie' })
        return
      }

      const playersArray = Array.from(room.players.values())
      const allReady = playersArray.every(p => p.isReady || p.isHost)

      if (!allReady) {
        socket.emit('error', { message: 'Tous les joueurs doivent être prêts' })
        return
      }

      await prisma.game.update({
        where: { id: room.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      })

      room.status = 'IN_PROGRESS'
      room.currentQuestionIndex = 0

      await this.roomManager.broadcastToRoom(roomCode, room.id, room)

      // Start first question (this would be handled by game logic)
      console.log(`Game ${roomCode} started by ${user.username}`)

    } catch (error) {
      this.handleSocketError(socket, error, 'start-game')
    }
  }

  private async handleSubmitAnswer(socket: Socket, data: any) {
    try {
      if (!rateLimitByUser(socket, 1, 1000)) return // 1 answer per second max

      const { roomCode, questionId, answer, timeSpent } = data
      const user = socket.user

      const room = Array.from(this.roomManager.getAllRooms().values())
        .find(r => r.roomCode === roomCode)

      if (!room || room.status !== 'IN_PROGRESS') return

      const player = room.players.get(user.id)
      if (!player) return

      // Verify current question
      if (!room.currentQuestion || room.currentQuestion.id !== questionId) {
        console.log(`Answer ignored: wrong question. Expected ${room.currentQuestion?.id}, got ${questionId}`)
        return
      }

      // Prevent duplicate answers
      const existingAnswer = room.answers.get(user.id)
      if (existingAnswer) {
        console.log(`Duplicate answer ignored from ${user.username}`)
        return
      }

      room.answers.set(user.id, {
        questionId,
        answer,
        timeSpent,
        timestamp: Date.now()
      })

      socket.to(roomCode).emit('player-answered', {
        playerId: user.id,
        username: player.username
      })

      console.log(`${user.username} answered question ${questionId}. Answers: ${room.answers.size}/${room.players.size}`)

      // Update room state
      await this.roomManager.updateRoom(room.id, { answers: room.answers })

    } catch (error) {
      this.handleSocketError(socket, error, 'submit-answer')
    }
  }

  private async handleUsePowerup(socket: Socket, data: any) {
    try {
      if (!rateLimitByUser(socket, 1, 2000)) return // 1 powerup per 2 seconds

      const { roomCode, powerUpId, powerUpType } = data
      const user = socket.user

      // Implementation would depend on your powerup system
      console.log(`${user.username} used power-up: ${powerUpType}`)

    } catch (error) {
      this.handleSocketError(socket, error, 'use-powerup')
    }
  }

  private handleSendMessage(socket: Socket, data: any) {
    const { roomCode, message, type = 'PREDEFINED' } = data
    const user = socket.user

    if (!rateLimitByUser(socket, 3, 1000)) return // 3 messages per second

    this.io.to(roomCode).emit('chat-message', {
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      message,
      type,
      timestamp: Date.now()
    })
  }

  private async handleDisconnect(socket: Socket, reason: string) {
    try {
      const user = socket.user
      console.log(`User ${user?.username} disconnected:`, socket.id, 'Reason:', reason)

      // Enhanced disconnect handling based on reason
      const isTemporaryDisconnect = [
        'transport close',
        'ping timeout',
        'transport error'
      ].includes(reason)

      // Remove connection tracking
      await DatabaseUtils.removeConnection(socket.id)

      for (const room of this.roomManager.getAllRooms().values()) {
        const player = Array.from(room.players.values()).find(p => p.socketId === socket.id)
        if (player) {
          if (isTemporaryDisconnect) {
            // Mark as disconnected but keep in game
            player.isConnected = false
            player.socketId = null

            console.log(`${player.username} temporarily disconnected from game ${room.roomCode}`)

            socket.to(room.roomCode).emit('player-disconnected', {
              playerId: player.userId,
              username: player.username
            })

            // Set timeout for permanent disconnect
            setTimeout(async () => {
              const currentPlayer = room.players.get(player.userId)
              if (currentPlayer && !currentPlayer.isConnected) {
                await this.handlePermanentDisconnect(room, player)
              }
            }, 30000) // 30 seconds grace period

          } else {
            await this.handlePermanentDisconnect(room, player)
          }
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error)
    }
  }

  private async handlePermanentDisconnect(room: any, player: any) {
    console.log(`${player.username} left game ${room.roomCode} permanently`)

    room.players.delete(player.userId)

    const playersArray = Array.from(room.players.values())
    this.io.to(room.roomCode).emit('player-left', {
      playerId: player.userId,
      players: playersArray
    })

    // Handle host transfer
    if (player.userId === room.hostId && playersArray.length > 0) {
      const newHost = playersArray[0]
      room.hostId = newHost.userId
      newHost.isHost = true

      console.log(`Host transferred to ${newHost.username} in game ${room.roomCode}`)

      this.io.to(room.roomCode).emit('host-transferred', {
        newHostId: newHost.userId,
        newHostName: newHost.username
      })

      // Update in database
      prisma.game.update({
        where: { id: room.id },
        data: { hostId: newHost.userId }
      }).catch(err => console.error('Failed to update host in DB:', err))
    }

    // If no players left, end game
    if (playersArray.length === 0) {
      room.status = 'FINISHED'
      console.log(`Game ${room.roomCode} ended - no players left`)

      await this.roomManager.removeRoom(room.id)

      // Update database
      prisma.game.update({
        where: { id: room.id },
        data: {
          status: 'FINISHED',
          endedAt: new Date()
        }
      }).catch(err => console.error('Failed to end game in DB:', err))
    }
  }

  private handleSocketError(socket: Socket, error: any, context: string) {
    console.error(`Socket error in ${context}:`, error)
    socket.emit('error', {
      message: error.message || 'Une erreur est survenue',
      context,
      timestamp: Date.now()
    })
  }

  // Cleanup methods
  async cleanup() {
    // Cleanup rate limiters
    const now = Date.now()
    for (const [userId, limit] of userRateLimiter.entries()) {
      if (now > limit.resetTime) {
        userRateLimiter.delete(userId)
      }
    }

    // Cleanup expired game rooms
    await gameStateManager.cleanupExpiredRooms()
  }
}

// Cleanup interval
setInterval(async () => {
  // This would be called from the main server file
}, 60000) // Every minute