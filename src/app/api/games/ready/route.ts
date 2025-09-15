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

    // Store readiness in game settings
    const settings = game.settings as any || {}
    if (!settings.readyPlayers) settings.readyPlayers = {}
    settings.readyPlayers[payload.userId] = true

    // Update game with new settings
    await prisma.game.update({
      where: { id: game.id },
      data: { settings }
    })

    const updatedGame = await prisma.game.findUnique({
      where: { id: game.id },
      include: {
        players: { include: { user: { select: { id: true, username: true, avatar: true } } } }
      }
    })

    const readyMap = (updatedGame?.settings as any)?.readyPlayers || {}

    return NextResponse.json({
      game: {
        id: updatedGame!.id,
        roomCode: updatedGame!.roomCode,
        status: updatedGame!.status,
        settings: updatedGame!.settings,
        hostId: updatedGame!.hostId,
        players: updatedGame!.players.map(p => ({ id: p.id, score: p.score, isReady: !!readyMap[p.user.id], user: p.user })),
      }
    })
  } catch (error) {
    console.error('Game ready error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
