import { PrismaClient } from '@prisma/client'

// Configuration globale pour éviter la duplication d'instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configuration sécurisée de Prisma avec logging approprié
const createPrismaClient = () => {
  const logLevel = process.env.NODE_ENV === 'production'
    ? ['error']
    : ['query', 'info', 'warn', 'error']

  return new PrismaClient({
    log: logLevel as any,
    errorFormat: 'pretty',
  })
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