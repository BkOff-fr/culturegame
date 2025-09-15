import { PrismaClient } from '@prisma/client'

// Configuration globale pour éviter la duplication d'instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configuration sécurisée de Prisma avec logging approprié et optimisations
const createPrismaClient = () => {
  const isDev = process.env.NODE_ENV !== 'production'
  const logLevel = isDev ? ['query', 'info', 'warn', 'error'] : ['error']

  const client = new PrismaClient({
    log: logLevel as any,
    errorFormat: isDev ? 'pretty' : 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL || "file:./dev.db"
      }
    }
  })

  // Enhanced query performance monitoring
  client.$on('query' as any, (e: any) => {
    if (e.duration > 100) { // Log slow queries
      console.warn(`🐌 Slow query detected: ${e.query.substring(0, 100)}... (${e.duration}ms)`)
    }
  })

  // Connection monitoring for production
  if (!isDev) {
    client.$on('beforeExit' as any, async () => {
      console.log('🔌 Prisma client disconnecting...')
    })
  }

  return client
}

// Singleton pattern pour réutiliser la même instance
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// En développement, conserver l'instance globalement pour les hot reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Fonction utilitaire pour fermer proprement la connexion
export const disconnectPrisma = async () => {
  await prisma.$disconnect()
}

// Fonction utilitaire pour vérifier la connexion
export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Utility functions for optimized database operations
export class DatabaseUtils {
  // Batch operations for better performance
  static async batchUpdatePlayerScores(updates: Array<{playerId: string; score: number}>) {
    if (updates.length === 0) return []

    const transactions = updates.map(({ playerId, score }) =>
      prisma.gamePlayer.update({
        where: { id: playerId },
        data: { score }
      })
    )

    return await prisma.$transaction(transactions)
  }

  static async createAnswersInBatch(answers: Array<{
    gamePlayerId: string
    gameQuestionId: string
    answer: any
    isCorrect: boolean
    pointsEarned: number
    timeSpent: number
  }>) {
    if (answers.length === 0) return

    return await prisma.playerAnswer.createMany({
      data: answers,
      skipDuplicates: true
    })
  }

  // Connection tracking utilities
  static async trackConnection(userId: string, socketId: string, gameId?: string, userAgent?: string, ipAddress?: string) {
    return await prisma.playerConnection.upsert({
      where: { socketId },
      create: {
        userId,
        socketId,
        gameId,
        connectedAt: new Date(),
        lastSeen: new Date(),
        userAgent: userAgent || '',
        ipAddress: ipAddress || ''
      },
      update: {
        lastSeen: new Date(),
        gameId
      }
    })
  }

  static async removeConnection(socketId: string) {
    return await prisma.playerConnection.delete({
      where: { socketId }
    }).catch(() => null) // Ignore if already deleted
  }

  static async updateConnectionActivity(socketId: string) {
    return await prisma.playerConnection.update({
      where: { socketId },
      data: { lastSeen: new Date() }
    }).catch(() => null)
  }

  static async getActiveConnections(gameId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    return await prisma.playerConnection.findMany({
      where: {
        gameId,
        lastSeen: {
          gte: fiveMinutesAgo
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    })
  }

  // Game room state persistence
  static async updateGameRoomState(gameId: string, roomData: any) {
    return await prisma.gameRoomState.upsert({
      where: { gameId },
      create: {
        gameId,
        lastActivity: new Date(),
        playerCount: roomData.playerCount || 0,
        currentQuestionIndex: roomData.currentQuestionIndex || 0,
        status: roomData.status,
        roomData: roomData
      },
      update: {
        lastActivity: new Date(),
        playerCount: roomData.playerCount || 0,
        currentQuestionIndex: roomData.currentQuestionIndex || 0,
        status: roomData.status,
        roomData: roomData
      }
    })
  }

  static async getGameRoomState(gameId: string) {
    return await prisma.gameRoomState.findUnique({
      where: { gameId }
    })
  }

  static async cleanupStaleRoomStates() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    return await prisma.gameRoomState.deleteMany({
      where: {
        lastActivity: {
          lt: oneHourAgo
        }
      }
    })
  }

  static async cleanupStaleConnections() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    return await prisma.playerConnection.deleteMany({
      where: {
        lastSeen: {
          lt: fiveMinutesAgo
        }
      }
    })
  }
}