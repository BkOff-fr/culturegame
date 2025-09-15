import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateToken, validateUsername, validateEmail, validatePassword, checkRateLimit } from '@/lib/auth'
import { validate, checkValidationRateLimit, sanitizeString } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  try {
    // Rate limiting
    if (!checkRateLimit(`register_${clientIP}`, 5, 15 * 60 * 1000)) { // 5 tentatives par 15 minutes
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 })
    }

    if (!checkValidationRateLimit(clientIP)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Parse et validation des données
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON data' }, { status: 400 })
    }

    // Validation avec notre système
    const validationResult = validate(body, 'register')
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.errors
      }, { status: 400 })
    }

    const { username, email, password, avatar } = validationResult.sanitizedData

    // Validations supplémentaires avec les fonctions d'auth
    if (!validateUsername(username)) {
      return NextResponse.json({
        error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'
      }, { status: 400 })
    }

    if (email && !validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    if (!validatePassword(password)) {
      return NextResponse.json({
        error: 'Password must be 6-128 characters long'
      }, { status: 400 })
    }

    // Sanitiser les entrées
    const sanitizedUsername = sanitizeString(username)
    const sanitizedEmail = email ? sanitizeString(email) : null
    const sanitizedAvatar = avatar ? sanitizeString(avatar) : '🎭'

    // Vérifier si l'utilisateur existe déjà avec timeout
    const existingUserPromise = prisma.user.findFirst({
      where: {
        OR: [
          { username: sanitizedUsername },
          ...(sanitizedEmail ? [{ email: sanitizedEmail }] : [])
        ]
      },
      select: { id: true, username: true, email: true }
    })

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    })

    let existingUser
    try {
      existingUser = await Promise.race([existingUserPromise, timeoutPromise])
    } catch (error) {
      console.error('Database error during user lookup:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existingUser) {
      // Ne pas révéler si c'est l'username ou l'email qui existe déjà (sécurité)
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    // Hasher le mot de passe avec gestion d'erreurs
    let passwordHash: string
    try {
      passwordHash = await hashPassword(password)
    } catch (error) {
      console.error('Password hashing error:', error)
      return NextResponse.json({ error: 'Password processing error' }, { status: 500 })
    }

    // Créer l'utilisateur avec timeout
    const createUserPromise = prisma.user.create({
      data: {
        username: sanitizedUsername,
        email: sanitizedEmail,
        passwordHash,
        avatar: sanitizedAvatar
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true
      }
    })

    let user: any
    try {
      user = await Promise.race([createUserPromise, timeoutPromise]) as any
    } catch (error: any) {
      console.error('User creation error:', error)

      // Gestion des erreurs de contraintes uniques
      if (error?.code === 'P2002') {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 })
      }

      return NextResponse.json({ error: 'User creation failed' }, { status: 500 })
    }

    // Générer le token avec gestion d'erreurs
    let token: string
    try {
      token = generateToken(user.id)
    } catch (error) {
      console.error('Token generation error:', error)
      return NextResponse.json({ error: 'Authentication setup failed' }, { status: 500 })
    }

    // Créer le profil utilisateur par défaut
    try {
      await prisma.userProfile.create({
        data: {
          userId: user.id,
          avatar: { shape: 'circle', color: '#6366f1', accessories: [], background: '#f1f5f9' },
          coins: 1000,
          experience: 0,
          level: 1,
          eloRating: 1200
        }
      })
    } catch (error) {
      console.error('Profile creation error:', error)
      // Ne pas faire échouer la registration si la création du profil échoue
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        joinedAt: user.createdAt
      },
      token, // Inclure le token dans la réponse
      message: 'Registration successful'
    }, { status: 201 })

    // Définir le cookie de manière sécurisée
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: '/'
    })

    console.log(`✅ New user registered: ${user.username} (${user.id})`)

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during registration'
    }, { status: 500 })
  }
}