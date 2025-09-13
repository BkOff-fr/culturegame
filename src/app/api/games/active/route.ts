import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string }

    // Chercher si l'utilisateur a une partie active
    const activeGame = await prisma.game.findFirst({
      where: {
        status: {
          in: ['WAITING', 'STARTING', 'IN_PROGRESS']
        },
        players: {
          some: {
            userId: payload.userId
          }
        }
      },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    if (!activeGame) {
      return NextResponse.json({ game: null })
    }

    return NextResponse.json({ game: activeGame })

  } catch (error) {
    console.error('Get active game error:', error)
    return NextResponse.json({ error: 'Failed to get active game' }, { status: 500 })
  }
}