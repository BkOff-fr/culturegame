import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

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