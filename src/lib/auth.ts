import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes, createHash } from 'crypto'

// Configuration sécurisée - REQUIRED en production
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production environment')
    }
    console.warn('⚠️  JWT_SECRET not set, using development fallback (NOT SECURE)')
    return 'dev-secret-not-for-production-use-only'
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }

  return secret
}

// Configuration bcrypt sécurisée
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10)

// Cache du secret pour éviter les vérifications répétées
let JWT_SECRET_CACHED: string | null = null

const getJWTSecretCached = (): string => {
  if (!JWT_SECRET_CACHED) {
    JWT_SECRET_CACHED = getJWTSecret()
  }
  return JWT_SECRET_CACHED
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long')
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  if (!password || !hashedPassword) {
    return false
  }

  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

export function generateToken(userId: string, expiresIn: string = '7d'): string {
  if (!userId) {
    throw new Error('userId is required for token generation')
  }

  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    jti: randomBytes(16).toString('hex'), // Unique token ID pour révocation
  }

  return jwt.sign(payload, getJWTSecretCached(), { expiresIn })
}

export function verifyToken(token: string): { userId: string; iat: number; jti: string } | null {
  if (!token) {
    return null
  }

  try {
    const payload = jwt.verify(token, getJWTSecretCached()) as {
      userId: string
      iat: number
      jti: string
    }

    if (!payload.userId) {
      return null
    }

    return payload
  } catch (error) {
    // Ne pas logger les erreurs de token car c'est normal en cas d'expiration
    return null
  }
}

// Génération de code de salle sécurisée
export function generateRoomCode(): string {
  // Utiliser crypto pour une génération vraiment aléatoire
  const bytes = randomBytes(4)
  let code = ''

  // Convertir en base36 et prendre les 6 premiers caractères
  for (let i = 0; i < bytes.length; i++) {
    code += bytes[i].toString(36).toUpperCase()
  }

  // S'assurer que le code fait exactement 6 caractères
  return code.substring(0, 6).padEnd(6, '0')
}

// Génération d'un hash pour identifier les sessions de manière sécurisée
export function generateSessionHash(userId: string, userAgent?: string): string {
  const data = `${userId}:${userAgent || 'unknown'}:${Date.now()}`
  return createHash('sha256').update(data).digest('hex').substring(0, 16)
}

// Validation des entrées utilisateur
export function validateUsername(username: string): boolean {
  return typeof username === 'string' &&
         username.length >= 3 &&
         username.length <= 30 &&
         /^[a-zA-Z0-9_-]+$/.test(username)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return typeof email === 'string' && emailRegex.test(email) && email.length <= 254
}

export function validatePassword(password: string): boolean {
  return typeof password === 'string' &&
         password.length >= 6 &&
         password.length <= 128
}

// Middleware de rate limiting basique (à améliorer avec Redis en production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxAttempts) {
    return false
  }

  record.count++
  return true
}

// Nettoyer les anciens enregistrements de rate limiting
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60 * 60 * 1000) // Nettoyage toutes les heures