import Redis from 'ioredis'

// Redis client configuration with retry and connection monitoring
class RedisClient {
  private client: Redis | null = null
  private isConnected = false

  constructor() {
    this.initializeClient()
  }

  private initializeClient() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const isDev = process.env.NODE_ENV !== 'production'

    this.client = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,

      // Development vs Production configurations
      ...(isDev ? {
        // Development: More aggressive reconnection
        connectTimeout: 10000,
        commandTimeout: 5000
      } : {
        // Production: More conservative settings
        connectTimeout: 60000,
        commandTimeout: 30000
      })
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.client) return

    this.client.on('connect', () => {
      console.log('🔗 Redis client connected')
      this.isConnected = true
    })

    this.client.on('ready', () => {
      console.log('✅ Redis client ready')
    })

    this.client.on('error', (error) => {
      console.error('❌ Redis client error:', error.message)
      this.isConnected = false
    })

    this.client.on('close', () => {
      console.log('🔌 Redis client connection closed')
      this.isConnected = false
    })

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...')
    })
  }

  async connect(): Promise<void> {
    if (!this.client) {
      this.initializeClient()
    }

    try {
      await this.client!.connect()
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect()
    }
  }

  getClient(): Redis | null {
    return this.client
  }

  isRedisConnected(): boolean {
    return this.isConnected && this.client?.status === 'ready'
  }
}

// Singleton Redis client
const redisClient = new RedisClient()

// Game State Management with Redis
export class RedisGameStateManager {
  private redis: Redis | null

  constructor() {
    this.redis = redisClient.getClient()
  }

  // Check if Redis is available, fallback to memory if not
  private isRedisAvailable(): boolean {
    return redisClient.isRedisConnected()
  }

  async setGameRoom(gameId: string, room: any): Promise<void> {
    if (!this.isRedisAvailable()) {
      console.warn('Redis not available, room state will not be persisted')
      return
    }

    try {
      const roomData = {
        ...room,
        lastActivity: Date.now(),
        // Convert Map objects to plain objects for serialization
        players: room.players ? Object.fromEntries(room.players) : {},
        answers: room.answers ? Object.fromEntries(room.answers) : {}
      }

      await this.redis!.setex(
        `game:${gameId}`,
        3600, // 1 hour TTL
        JSON.stringify(roomData)
      )

      // Also set a shorter-lived activity marker
      await this.redis!.setex(
        `game:activity:${gameId}`,
        300, // 5 minutes TTL
        Date.now().toString()
      )
    } catch (error) {
      console.error('Failed to save game room to Redis:', error)
    }
  }

  async getGameRoom(gameId: string): Promise<any | null> {
    if (!this.isRedisAvailable()) {
      return null
    }

    try {
      const data = await this.redis!.get(`game:${gameId}`)
      if (!data) return null

      const roomData = JSON.parse(data)

      // Convert plain objects back to Maps
      if (roomData.players) {
        roomData.players = new Map(Object.entries(roomData.players))
      }
      if (roomData.answers) {
        roomData.answers = new Map(Object.entries(roomData.answers))
      }

      return roomData
    } catch (error) {
      console.error('Failed to get game room from Redis:', error)
      return null
    }
  }

  async updateRoomActivity(gameId: string): Promise<void> {
    if (!this.isRedisAvailable()) return

    try {
      await this.redis!.setex(
        `game:activity:${gameId}`,
        300, // 5 minutes TTL
        Date.now().toString()
      )
    } catch (error) {
      console.error('Failed to update room activity in Redis:', error)
    }
  }

  async removeGameRoom(gameId: string): Promise<void> {
    if (!this.isRedisAvailable()) return

    try {
      await Promise.all([
        this.redis!.del(`game:${gameId}`),
        this.redis!.del(`game:activity:${gameId}`)
      ])
    } catch (error) {
      console.error('Failed to remove game room from Redis:', error)
    }
  }

  async getActiveGameRooms(): Promise<string[]> {
    if (!this.isRedisAvailable()) return []

    try {
      const keys = await this.redis!.keys('game:activity:*')
      return keys.map(key => key.replace('game:activity:', ''))
    } catch (error) {
      console.error('Failed to get active game rooms from Redis:', error)
      return []
    }
  }

  async cleanupExpiredRooms(): Promise<number> {
    if (!this.isRedisAvailable()) return 0

    try {
      const gameKeys = await this.redis!.keys('game:*')
      const activityKeys = gameKeys.filter(key => key.includes('activity:'))

      let cleanedCount = 0

      for (const activityKey of activityKeys) {
        const gameId = activityKey.replace('game:activity:', '')
        const gameKey = `game:${gameId}`

        const exists = await this.redis!.exists(activityKey)
        if (!exists) {
          // Activity marker expired, clean up the game room
          await this.redis!.del(gameKey)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Redis cleanup: removed ${cleanedCount} expired game rooms`)
      }

      return cleanedCount
    } catch (error) {
      console.error('Failed to cleanup expired rooms in Redis:', error)
      return 0
    }
  }

  // User session management
  async setUserSession(userId: string, sessionData: any): Promise<void> {
    if (!this.isRedisAvailable()) return

    try {
      await this.redis!.setex(
        `user:session:${userId}`,
        1800, // 30 minutes TTL
        JSON.stringify(sessionData)
      )
    } catch (error) {
      console.error('Failed to save user session to Redis:', error)
    }
  }

  async getUserSession(userId: string): Promise<any | null> {
    if (!this.isRedisAvailable()) return null

    try {
      const data = await this.redis!.get(`user:session:${userId}`)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Failed to get user session from Redis:', error)
      return null
    }
  }

  async removeUserSession(userId: string): Promise<void> {
    if (!this.isRedisAvailable()) return

    try {
      await this.redis!.del(`user:session:${userId}`)
    } catch (error) {
      console.error('Failed to remove user session from Redis:', error)
    }
  }

  // Rate limiting
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{allowed: boolean; remaining: number}> {
    if (!this.isRedisAvailable()) {
      // Fallback to allowing all requests if Redis is not available
      return { allowed: true, remaining: maxRequests }
    }

    try {
      const current = await this.redis!.incr(key)

      if (current === 1) {
        await this.redis!.expire(key, windowSeconds)
      }

      const remaining = Math.max(0, maxRequests - current)
      const allowed = current <= maxRequests

      return { allowed, remaining }
    } catch (error) {
      console.error('Failed to check rate limit in Redis:', error)
      return { allowed: true, remaining: maxRequests }
    }
  }
}

// Export singleton instance
export const gameStateManager = new RedisGameStateManager()
export { redisClient }

// Initialize Redis connection on module load
if (typeof window === 'undefined') { // Server-side only
  redisClient.connect().catch(error => {
    console.warn('Redis connection failed, continuing without Redis:', error.message)
  })
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await redisClient.disconnect()
})

process.on('SIGINT', async () => {
  await redisClient.disconnect()
})