import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { roomCode } = await request.json()
    if (!roomCode) {
      return NextResponse.json({ error: 'Room code is required' }, { status: 400 })
    }

    const game = await prisma.game.findUnique({ where: { roomCode: roomCode.toUpperCase() } })
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    await prisma.gamePlayer.deleteMany({ where: { gameId: game.id, userId: payload.userId } })

    const remainingPlayers = await prisma.gamePlayer.count({ where: { gameId: game.id } })

    if (remainingPlayers === 0) {
      await prisma.game.delete({ where: { id: game.id } })
      return NextResponse.json({ game: null })
    }

    const updatedGame = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        players: {
          include: {
            user: { select: { id: true, username: true, avatar: true } }
          }
        }
      }
    })

    return NextResponse.json({
      game: {
        id: updatedGame!.id,
        roomCode: updatedGame!.roomCode,
        status: updatedGame!.status,
        settings: updatedGame!.settings,
        hostId: updatedGame!.hostId,
        players: updatedGame!.players.map(p => ({ id: p.id, score: p.score, user: p.user }))
      }
    })
  } catch (error) {
    console.error('Game leave error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 