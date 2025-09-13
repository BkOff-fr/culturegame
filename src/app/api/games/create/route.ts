import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, generateRoomCode } from '@/lib/auth'

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

    const { settings } = await request.json()

    // Générer un code de salle unique
    let roomCode: string
    let attempts = 0
    do {
      roomCode = generateRoomCode()
      const existingGame = await prisma.game.findUnique({
        where: { roomCode }
      })
      if (!existingGame) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return NextResponse.json({ error: 'Could not generate unique room code' }, { status: 500 })
    }

    // Créer le jeu
    const game = await prisma.game.create({
      data: {
        roomCode,
        hostId: payload.userId,
        settings: settings || {
          maxPlayers: 4,
          timePerQuestion: 30,
          categories: ['all'],
          difficulty: 'all'
        }
      }
    })

    // Ajouter le créateur comme joueur
    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: payload.userId
      }
    })

    // Récupérer le jeu avec les joueurs
    const gameWithPlayers = await prisma.game.findUnique({
      where: { id: game.id },
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

    return NextResponse.json({
      game: {
        id: gameWithPlayers!.id,
        roomCode: gameWithPlayers!.roomCode,
        status: gameWithPlayers!.status,
        settings: gameWithPlayers!.settings,
        players: gameWithPlayers!.players.map(p => ({
          id: p.id,
          score: p.score,
          user: p.user
        }))
      }
    })
  } catch (error) {
    console.error('Game creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}