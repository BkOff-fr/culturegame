import type { Server, Socket } from 'socket.io'
import { GameSocketHandlers } from './gameHandlers'
import { DatabaseUtils } from '@/lib/db'

// Extended socket interface with user data
declare module 'socket.io' {
  interface Socket {
    userId: string
    user: {
      id: string
      username: string
      avatar: string
      joinedAt: Date
    }
  }
}

export class SocketHandlerManager {
  private gameHandlers: GameSocketHandlers
  private cleanupInterval: NodeJS.Timeout

  constructor(private io: Server) {
    this.gameHandlers = new GameSocketHandlers(io)

    // Setup periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup()
    }, 60000) // Every minute
  }

  setupHandlers(socket: Socket) {
    console.log(`Setting up handlers for user ${socket.user.username} (${socket.id})`)

    // Track connection in database
    this.trackConnection(socket)

    // Setup game-related handlers
    this.gameHandlers.setupHandlers(socket)

    // Setup general handlers
    this.setupGeneralHandlers(socket)

    // Enhanced disconnect handling
    socket.on('disconnect', async (reason) => {
      await this.handleDisconnect(socket, reason)
    })
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

      console.log(`✅ Connection tracked for ${socket.user.username}`)
    } catch (error) {
      console.error('Failed to track connection:', error)
    }
  }

  private setupGeneralHandlers(socket: Socket) {
    // Connection health check
    socket.on('ping', (callback) => {
      if (typeof callback === 'function') {
        callback('pong')
      }
    })

    // Update activity
    socket.on('heartbeat', async () => {
      await DatabaseUtils.updateConnectionActivity(socket.id)
    })

    // User status updates
    socket.on('update-status', (data: { status: string }) => {
      // Broadcast status update to relevant rooms
      // Implementation depends on your status system
      console.log(`${socket.user.username} updated status: ${data.status}`)
    })

    // Error reporting from client
    socket.on('client-error', (data: { error: string; context?: string }) => {
      console.error(`Client error from ${socket.user.username}:`, data)
      // Could log to monitoring service
    })
  }

  private async handleDisconnect(socket: Socket, reason: string) {
    try {
      console.log(`User ${socket.user?.username} disconnected: ${socket.id}, Reason: ${reason}`)

      // Remove connection tracking
      await DatabaseUtils.removeConnection(socket.id)

      // Log disconnect for analytics
      const disconnectLog = {
        userId: socket.user.id,
        socketId: socket.id,
        reason,
        timestamp: new Date(),
        userAgent: socket.handshake.headers['user-agent'],
        ipAddress: socket.handshake.address
      }

      console.log('Disconnect log:', disconnectLog)
      // Could send to analytics service

    } catch (error) {
      console.error('Error handling disconnect:', error)
    }
  }

  private async performCleanup() {
    try {
      // Cleanup handlers
      await this.gameHandlers.cleanup()

      // Cleanup stale connections
      await DatabaseUtils.cleanupStaleConnections()

      // Log connected users count
      const connectedSockets = await this.io.fetchSockets()
      console.log(`🔌 Active connections: ${connectedSockets.length}`)

    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  async destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Perform final cleanup
    await this.performCleanup()
  }
}

export { GameSocketHandlers }